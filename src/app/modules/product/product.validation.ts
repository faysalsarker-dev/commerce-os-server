import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.coerce.number().positive("Cost price must be greater than 0"),
  sellingPrice: z.coerce.number().positive("Selling price must be greater than 0"),
});

export const updateProductSchema = z
  .object({
    name: z
      .string()
      .min(2, "Product name must be at least 2 characters")
      .optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    costPrice: z.coerce.number().positive("Cost price must be greater than 0").optional(),
    sellingPrice: z.coerce.number().positive("Selling price must be greater than 0").optional(),
  })
  .refine((data) => Boolean(Object.keys(data).length), {
    message: "At least one field must be provided to update product",
  });

export const createVariantSchema = z.object({
  size: z.string().min(1),
  sku: z.string().min(1),
  stockQty: z.coerce.number().int(),
  costPriceOverride: z.coerce.number().nonnegative().nullable().optional(),
  sellingPriceOverride: z.coerce.number().nonnegative().nullable().optional(),
});

export const updateVariantSchema = createVariantSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided to update variant" },
);

export const createColorSchema = z.object({
  colorName: z.string().min(1),
  colorHex: z.string().optional(),
});

export const updateColorSchema = z.object({
  colorName: z.string().min(1).optional(),
  colorHex: z.string().nullable().optional(),
  // Multer submits repeated fields as an array, and plain JSON may submit objects.
  images_existing: z.unknown().optional(),
});

export const stockMovementSchema = z.object({
  type: z.enum(["RESTOCK", "SALE", "RETURN", "DAMAGED", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().nonnegative(),
  reason: z.string().optional(),
});
