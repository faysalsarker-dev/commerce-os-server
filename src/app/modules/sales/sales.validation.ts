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
        discount: z.coerce.number().min(0).optional().default(0),
        reason: z.preprocess(emptyToUndefined, z.string().optional()),
      }),
    )
    .min(1, "At least one item is required for checkout"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  shippingFee: z.coerce.number().min(0).optional().default(0),
  paymentMethod: z
    .enum([
      "CASH",
      "BKASH",
      "NAGAD",
      "ROCKET",
      "CARD",
      "BANK_TRANSFER",
      "BANK",
      "OTHER",
    ])
    .default("CASH"),
  isFullPayment: z.boolean().default(true),
  paidAmount: z.coerce.number().min(0).optional(),
  dueAmount: z.coerce.number().min(0).optional(),
  dueDate: z.preprocess(emptyToUndefined, z.string().optional()),
  customerName: z.preprocess(emptyToUndefined, z.string().optional()),
  customerPhone: z.preprocess(emptyToUndefined, z.string().optional()),
  customerId: z.preprocess(emptyToUndefined, z.string().optional()),
  soldById: z.preprocess(emptyToUndefined, z.string().optional()),
  channel: z.enum(["ONLINE", "OFFLINE"]).optional().default("OFFLINE"),
  status: z
    .enum([
      "DRAFT",
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "PARTIALLY_RETURNED",
      "RETURNED",
    ])
    .optional()
    .default("COMPLETED"),
  shippingAddress: z.preprocess(emptyToUndefined, z.string().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
  reference: z.preprocess(emptyToUndefined, z.string().optional()),
  invoiceNo: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const returnProductSchema = z.object({
  variantId: z.string().min(1, "Variant id is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  reason: z.preprocess(emptyToUndefined, z.string().optional()),
});
