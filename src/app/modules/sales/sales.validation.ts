import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

export const scanProductSchema = z.object({
  code: z.string().min(1, "Product code is required"),
});

export const checkoutSaleSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1, "Variant id is required"),
        quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
        reason: z.preprocess(emptyToUndefined, z.string().optional()),
      }),
    )
    .min(1, "At least one item is required for checkout"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  paymentMethod: z
    .enum(["CASH", "BKASH", "NAGAD", "BANK", "CARD", "OTHER"])
    .default("CASH"),
  isFullPayment: z.boolean().default(true),
  paidAmount: z.coerce.number().min(0).optional(),
  dueAmount: z.coerce.number().min(0).optional(),
  dueDate: z.preprocess(emptyToUndefined, z.string().optional()),
  customerName: z.preprocess(emptyToUndefined, z.string().optional()),
  customerPhone: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const returnProductSchema = z.object({
  variantId: z.string().min(1, "Variant id is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  reason: z.preprocess(emptyToUndefined, z.string().optional()),
});
