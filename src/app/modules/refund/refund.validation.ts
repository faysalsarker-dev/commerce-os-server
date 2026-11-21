import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);
const paymentMethodSchema = z.enum([
  "CASH",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "CARD",
  "BANK_TRANSFER",
]);

export const createRefundSchema = z.object({
  saleId: z.string().min(1, "Sale ID is required"),
  items: z
    .array(
      z.object({
        saleItemId: z.string().min(1, "Sale item ID is required"),
        quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
        amount: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1, "At least one item is required for refund"),
  method: z
    .enum([
      "CASH",
      "BKASH",
      "NAGAD",
      "ROCKET",
      "CARD",
      "BANK_TRANSFER",
      "BANK",
      "OTHER",
      "MIX",
    ])
    .default("CASH"),
  payments: z
    .array(
      z.object({
        method: paymentMethodSchema,
        amount: z.coerce.number().positive("Refund payment amount must be greater than 0"),
        reference: z.preprocess(emptyToUndefined, z.string().optional()),
      }),
    )
    .min(1, "At least one refund payment is required")
    .optional(),
  reason: z.preprocess(emptyToUndefined, z.string().optional()),
  processedById: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const createExchangeSchema = z.object({
  saleId: z.string().min(1, "Sale ID is required"),
  reason: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  processedById: z.preprocess(emptyToUndefined, z.string().optional()),
  items: z.array(z.object({
    saleItemId: z.string().min(1),
    replacementVariantId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
});

export const getRefundsQuerySchema = z.object({
  saleId: z.preprocess(emptyToUndefined, z.string().optional()),
  processedById: z.preprocess(emptyToUndefined, z.string().optional()),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  searchTerm: z.preprocess(emptyToUndefined, z.string().optional()),
});
