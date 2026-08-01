import { Readable } from "stream";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import { cloudinaryUpload } from "../../config/cloudinary.config";
import { createOne, deleteOne, getAll, getById, updateOne } from "../../services/base.service";

const fullProductInclude = {
  category: true,
  colors: { include: { variants: true } },
};

type ProductPayload = {
  name?: string;
  description?: string;
  categoryId?: string | null;
  costPrice?: number;
  sellingPrice?: number;
};

type ColorPayload = { colorName?: string; colorHex?: string | null };
type VariantPayload = {
  size?: string;
  sku?: string;
  stockQty?: number;
  costPriceOverride?: number | null;
  sellingPriceOverride?: number | null;
};
type MovementType = "RESTOCK" | "SALE" | "RETURN" | "DAMAGED" | "ADJUSTMENT";

const movementTypeMap: Record<MovementType, string> = {
  RESTOCK: "PURCHASE_IN",
  SALE: "SALE_OUT",
  RETURN: "RETURN_IN",
  // The unchanged schema has no DAMAGED enum member; ADJUSTMENT is its persisted equivalent.
  DAMAGED: "ADJUSTMENT",
  ADJUSTMENT: "ADJUSTMENT",
};

const uploadImage = (file: Express.Multer.File): Promise<string> =>
  new Promise((resolve, reject) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_-]/g, "-");
    const upload = cloudinaryUpload.uploader.upload_stream(
      { folder: "products", public_id: `${Date.now()}-${safeName}`, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Image upload failed"));
        resolve(result.secure_url);
      },
    );
    Readable.from(file.buffer).pipe(upload);
  });

const uploadImages = async (files: Express.Multer.File[] = []) =>
  Promise.all(files.map(uploadImage));

const parseExistingImages = (value: unknown): string[] => {
  const entries = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return entries.map((entry) => {
    const parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
    if (!parsed || typeof parsed.url !== "string") {
      throw new AppError("images_existing must contain JSON objects with a url", 400);
    }
    return parsed.url;
  });
};

export const createProduct = (payload: ProductPayload) =>
  createOne(prisma.product, payload as any);

export const getProducts = async (query: Record<string, unknown>) => {
  const { search, ...rest } = query;
  const result = await getAll<any>(
    prisma.product,
    { ...rest, ...(search !== undefined && { searchTerm: search }) },
    ["name"],
    fullProductInclude,
  );

  return {
    meta: result.meta,
    data: result.data.map((product: any) => ({
      id: product.id,
      name: product.name,
      category: product.category ? { id: product.category.id, name: product.category.name } : null,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      colorCount: product.colors.length,
      totalStock: product.colors.reduce(
        (total: number, color: any) => total + color.variants.reduce((sum: number, variant: any) => sum + variant.stockQty, 0),
        0,
      ),
      createdAt: product.createdAt,
    })),
  };
};

export const getProductById = (id: string) => getById(prisma.product, id, fullProductInclude);
export const updateProductById = (id: string, payload: ProductPayload) => updateOne(prisma.product, id, payload as any);
export const deleteProductById = (id: string) => deleteOne(prisma.product, id);

export const createColor = async (
  productId: string,
  payload: ColorPayload,
  files: Express.Multer.File[]
) => {
  const images = files.map((item) => item.path);

  return prisma.productColor.create({
    data: {
      productId,
      colorName: payload.colorName as string,
      colorHex: payload.colorHex || null,
      images,
    },
  });
};

export const updateColor = async (
  id: string,
  payload: ColorPayload & { images_existing?: unknown },
  files: Express.Multer.File[],
) => {
  const hasImagesUpdate = payload.images_existing !== undefined || files.length > 0;
  const data: Record<string, unknown> = { colorName: payload.colorName, colorHex: payload.colorHex };
  if (hasImagesUpdate) data.images = [...parseExistingImages(payload.images_existing), ...(await uploadImages(files))];
  return updateOne(prisma.productColor, id, data as any);
};

export const deleteColor = (id: string) => deleteOne(prisma.productColor, id);
export const createVariant = (colorId: string, payload: VariantPayload) =>
  createOne(prisma.productVariant, { productColorId: colorId, ...payload } as any);
export const updateVariant = (id: string, payload: VariantPayload) => updateOne(prisma.productVariant, id, payload as any);
export const deleteVariant = (id: string) => deleteOne(prisma.productVariant, id);

export const createStockMovement = async (
  variantId: string,
  payload: { type: MovementType; quantity: number; reason?: string },
) => {
  const dbType = movementTypeMap[payload.type];
  if (!dbType) throw new AppError("Invalid stock movement type", 400);

  return prisma.$transaction(async (tx) => {
    await getById(tx.productVariant as any, variantId);
    const stockQty = payload.type === "ADJUSTMENT"
      ? { set: payload.quantity }
      : { increment: ["RESTOCK", "RETURN"].includes(payload.type) ? payload.quantity : -payload.quantity };
    const [movement, variant] = await Promise.all([
      tx.stockMovement.create({ data: { variantId, type: dbType as any, quantity: payload.quantity, reason: payload.reason } }),
      tx.productVariant.update({ where: { id: variantId }, data: { stockQty } }),
    ]);
    return { ...movement, type: payload.type, variant };
  });
};
