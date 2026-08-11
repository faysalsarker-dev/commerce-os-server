import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";
import {
  ProductUncheckedCreateInput,
  ProductUncheckedUpdateInput,
} from "../../generated/prisma/models";
import { Product, Prisma, $Enums } from "../../generated/prisma/client";
import { broadcastStockUpdate } from "../../config/socket";
import { deleteEntityImages, handleImageUpdate } from "../../utils/imageUtils";

const productInclude = {
  category: true,
  colors: {
    include: {
      variants: true,
    },
  },
};

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

// ==================== STEP 1: BASE PRODUCT CONTAINER ====================

export const createProduct = async (
  payload: ProductUncheckedCreateInput,
): Promise<ProductWithRelations> => {
  if (payload.categoryId) {
    const categoryExists = await prisma.category.findUnique({
      where: { id: payload.categoryId },
    });
    if (!categoryExists) {
      throw new AppError("Category not found", 404);
    }
  }

  const product = await createOne<ProductWithRelations>(
    prisma.product,
    {
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId,
      costPrice: payload.costPrice,
      sellingPrice: payload.sellingPrice,
    } as Partial<Product>,
    productInclude,
  );

  return product;
};

export const getProducts = async (query: Record<string, any>) => {
  const result = await getAll<ProductWithRelations>(
    prisma.product,
    query,
    ["name", "description"],
    productInclude,
  );

  return {
    data: result.data,
    meta: result.meta,
  };
};

export const getProductById = async (productId: string): Promise<ProductWithRelations> => {
  const product = await getById<ProductWithRelations>(prisma.product, productId, productInclude);
  return product;
};

export const updateProductById = async (
  productId: string,
  payload: ProductUncheckedUpdateInput,
): Promise<ProductWithRelations> => {
  const product = await updateOne<ProductWithRelations>(
    prisma.product,
    productId,
    {
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId,
      costPrice: payload.costPrice,
      sellingPrice: payload.sellingPrice,
    } as Partial<Product>,
    productInclude,
  );

  return product;
};

export const deleteProductById = async (productId: string): Promise<ProductWithRelations> => {
  const product = await deleteOne<ProductWithRelations>(prisma.product, productId, productInclude);
  return product;
};

// ==================== STEP 2: PRODUCT COLOR ====================

export const addProductColor = async (payload: {
  productId: string;
  colorName: string;
  colorHex?: string;
  images?: string[];
}) => {
  const product = await prisma.product.findUnique({
    where: { id: payload.productId },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const existingColor = await prisma.productColor.findUnique({
    where: {
      productId_colorName: {
        productId: payload.productId,
        colorName: payload.colorName,
      },
    },
  });

  if (existingColor) {
    throw new AppError(
      `Color "${payload.colorName}" already exists for this product`,
      400,
    );
  }

  const color = await prisma.productColor.create({
    data: {
      productId: payload.productId,
      colorName: payload.colorName,
      colorHex: payload.colorHex,
      images: payload.images ?? [],
    },
    include: {
      variants: true,
    },
  });

  return color;
};

export const updateProductColor = async (
  colorId: string,
  payload: {
    colorName?: string;
    colorHex?: string;
    images?: string[];
  },
) => {
  const existingColor = await prisma.productColor.findUnique({
    where: { id: colorId },
  });

  if (!existingColor) {
    throw new AppError("Product color not found", 404);
  }

  if (payload.colorName && payload.colorName !== existingColor.colorName) {
    const duplicate = await prisma.productColor.findUnique({
      where: {
        productId_colorName: {
          productId: existingColor.productId,
          colorName: payload.colorName,
        },
      },
    });

    if (duplicate) {
      throw new AppError(
        `Color "${payload.colorName}" already exists for this product`,
        400,
      );
    }
  }

  // Delete removed old images from Cloudinary
  await handleImageUpdate(existingColor, payload, "images");

  const color = await prisma.productColor.update({
    where: { id: colorId },
    data: {
      ...(payload.colorName && { colorName: payload.colorName }),
      ...(payload.colorHex !== undefined && { colorHex: payload.colorHex }),
      ...(payload.images !== undefined && { images: payload.images }),
    },
    include: {
      variants: true,
    },
  });

  return color;
};

export const deleteProductColor = async (colorId: string) => {
  const color = await prisma.productColor.findUnique({
    where: { id: colorId },
  });

  if (!color) {
    throw new AppError("Product color not found", 404);
  }

  await deleteEntityImages(color, "images");

  await prisma.productColor.delete({
    where: { id: colorId },
  });

  return { message: "Product color deleted successfully", colorId };
};

// ==================== STEP 3: PRODUCT VARIANT ====================

export const addProductVariant = async (payload: {
  productId?: string;
  colorId?: string;
  productColorId?: string;
  size: string;
  sku: string;
  stockQty?: number;
  costPriceOverride?: number;
  sellingPriceOverride?: number;
  qrCode?: string;
}) => {
  const targetColorId = payload.productColorId ?? payload.colorId;

  if (!targetColorId) {
    throw new AppError("Product Color ID (productColorId or colorId) is required", 400);
  }

  const productColor = await prisma.productColor.findUnique({
    where: { id: targetColorId },
    include: {
      product: true,
    },
  });

  if (!productColor) {
    throw new AppError("Product color not found", 404);
  }

  const existingVariant = await prisma.productVariant.findUnique({
    where: {
      productColorId_size: {
        productColorId: targetColorId,
        size: payload.size,
      },
    },
  });

  if (existingVariant) {
    throw new AppError(
      `Variant size "${payload.size}" already exists for this color`,
      400,
    );
  }

  const existingSku = await prisma.productVariant.findUnique({
    where: { sku: payload.sku },
  });

  if (existingSku) {
    throw new AppError(`SKU "${payload.sku}" already exists`, 400);
  }

  if (payload.qrCode) {
    const existingQr = await prisma.productVariant.findUnique({
      where: { qrCode: payload.qrCode },
    });
    if (existingQr) {
      throw new AppError(`QR code "${payload.qrCode}" already exists`, 400);
    }
  }

  const stockQty = payload.stockQty ?? 0;

  const result = await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.create({
      data: {
        productColorId: targetColorId,
        size: payload.size,
        sku: payload.sku,
        stockQty,
        costPriceOverride: payload.costPriceOverride,
        sellingPriceOverride: payload.sellingPriceOverride,
        ...(payload.qrCode && { qrCode: payload.qrCode }),
      },
    });

    if (stockQty > 0) {
      await tx.stockMovement.create({
        data: {
          variantId: variant.id,
          type: $Enums.StockMovementType.PURCHASE_IN,
          quantity: stockQty,
          reason: "Initial stock on variant creation",
        },
      });
    }

    return variant;
  });

  if (stockQty > 0) {
    broadcastStockUpdate({
      variantId: result.id,
      productId: productColor.product?.id,
      productName: productColor.product?.name,
      colorName: productColor.colorName,
      size: result.size,
      stockQty: result.stockQty,
      movementType: "RETURN_IN",
      updatedAt: new Date(),
    });
  }

  return result;
};

export const updateProductVariant = async (
  variantId: string,
  payload: {
    size?: string;
    sku?: string;
    stockQty?: number;
    costPriceOverride?: number;
    sellingPriceOverride?: number;
    qrCode?: string;
  },
) => {
  const existingVariant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      productColor: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!existingVariant) {
    throw new AppError("Product variant not found", 404);
  }

  if (payload.sku && payload.sku !== existingVariant.sku) {
    const duplicateSku = await prisma.productVariant.findUnique({
      where: { sku: payload.sku },
    });
    if (duplicateSku) {
      throw new AppError(`SKU "${payload.sku}" already exists`, 400);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedVariant = await tx.productVariant.update({
      where: { id: variantId },
      data: {
        ...(payload.size && { size: payload.size }),
        ...(payload.sku && { sku: payload.sku }),
        ...(payload.stockQty !== undefined && { stockQty: payload.stockQty }),
        ...(payload.costPriceOverride !== undefined && { costPriceOverride: payload.costPriceOverride }),
        ...(payload.sellingPriceOverride !== undefined && { sellingPriceOverride: payload.sellingPriceOverride }),
        ...(payload.qrCode && { qrCode: payload.qrCode }),
      },
    });

    if (
      payload.stockQty !== undefined &&
      payload.stockQty !== existingVariant.stockQty
    ) {
      const diff = payload.stockQty - existingVariant.stockQty;
      await tx.stockMovement.create({
        data: {
          variantId: updatedVariant.id,
          type: diff > 0 ? $Enums.StockMovementType.PURCHASE_IN : $Enums.StockMovementType.ADJUSTMENT,
          quantity: Math.abs(diff),
          reason: diff > 0 ? "Stock manual update increase" : "Stock manual update decrease",
        },
      });
    }

    return updatedVariant;
  });

  if (
    payload.stockQty !== undefined &&
    payload.stockQty !== existingVariant.stockQty
  ) {
    broadcastStockUpdate({
      variantId: updated.id,
      productId: existingVariant.productColor?.product?.id,
      productName: existingVariant.productColor?.product?.name,
      colorName: existingVariant.productColor?.colorName,
      size: updated.size,
      stockQty: updated.stockQty,
      movementType: payload.stockQty > existingVariant.stockQty ? "RETURN_IN" : "SALE_OUT",
      updatedAt: new Date(),
    });
  }

  return updated;
};

export const deleteProductVariant = async (variantId: string) => {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) {
    throw new AppError("Product variant not found", 404);
  }

  await prisma.productVariant.delete({
    where: { id: variantId },
  });

  return { message: "Product variant deleted successfully", variantId };
};
