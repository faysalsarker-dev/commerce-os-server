import { z } from "zod";

export const scanProductSchema = z.object({
  code: z.string().min(1, "Product code is required"),
});

export const checkoutSaleSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1, "Variant id is required"),
        quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
        reason: z.string().optional(),
      }),
    )
    .min(1, "At least one item is required for checkout"),
});

export const returnProductSchema = z.object({
  variantId: z.string().min(1, "Variant id is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  reason: z.string().optional(),
});
