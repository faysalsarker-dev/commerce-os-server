import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

// Step 1: Base Product Container Schema
export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  categoryId: z.preprocess(emptyToUndefined, z.string().optional()),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative"),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative"),
});

export const updateProductSchema = z
  .object({
    name: z.preprocess(
      emptyToUndefined,
      z.string().min(2, "Product name must be at least 2 characters").optional(),
    ),
    description: z.preprocess(emptyToUndefined, z.string().optional()),
    categoryId: z.preprocess(emptyToUndefined, z.string().optional()),
    costPrice: z.coerce.number().min(0, "Cost price cannot be negative").optional(),
    sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative").optional(),
  })
  .refine((data) => Boolean(Object.keys(data).length), {
    message: "At least one field must be provided to update product",
  });

const stringOrArrayToArray = (val: unknown) => {
  if (typeof val === "string") {
    if (!val.trim()) return [];
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not json
    }
    return [val];
  }
  return val;
};

// Step 2: Product Color Schema
export const createProductColorSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  colorName: z.string().min(1, "Color name is required"),
  colorHex: z.preprocess(emptyToUndefined, z.string().optional()),
  images: z.preprocess(stringOrArrayToArray, z.array(z.string()).default([])),
});

export const updateProductColorSchema = z
  .object({
    colorName: z.preprocess(
      emptyToUndefined,
      z.string().min(1, "Color name cannot be empty").optional(),
    ),
    colorHex: z.preprocess(emptyToUndefined, z.string().optional()),
    images: z.preprocess(stringOrArrayToArray, z.array(z.string()).optional()),
  })
  .refine((data) => Boolean(Object.keys(data).length), {
    message: "At least one field must be provided to update product color",
  });

// Step 3: Product Variant Schema (Accepts colorId OR productColorId)
export const createProductVariantSchema = z
  .object({
    productId: z.preprocess(emptyToUndefined, z.string().optional()),
    colorId: z.preprocess(emptyToUndefined, z.string().optional()),
    productColorId: z.preprocess(emptyToUndefined, z.string().optional()),
    size: z.string().min(1, "Size is required"),
    sku: z.string().min(1, "SKU is required"),
    stockQty: z.coerce.number().int().min(0, "Stock quantity cannot be negative").default(0),
    costPriceOverride: z.coerce.number().min(0).optional(),
    sellingPriceOverride: z.coerce.number().min(0).optional(),
    qrCode: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .refine((data) => Boolean(data.colorId || data.productColorId), {
    message: "Either colorId or productColorId is required for variant",
  });

export const updateProductVariantSchema = z
  .object({
    size: z.preprocess(
      emptyToUndefined,
      z.string().min(1, "Size cannot be empty").optional(),
    ),
    sku: z.preprocess(
      emptyToUndefined,
      z.string().min(1, "SKU cannot be empty").optional(),
    ),
    stockQty: z.coerce.number().int().min(0, "Stock quantity cannot be negative").optional(),
    costPriceOverride: z.coerce.number().min(0).optional(),
    sellingPriceOverride: z.coerce.number().min(0).optional(),
    qrCode: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .refine((data) => Boolean(Object.keys(data).length), {
    message: "At least one field must be provided to update product variant",
  });
