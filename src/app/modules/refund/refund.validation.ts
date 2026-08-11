import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

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
    ])
    .default("CASH"),
  reason: z.preprocess(emptyToUndefined, z.string().optional()),
  processedById: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const getRefundsQuerySchema = z.object({
  saleId: z.preprocess(emptyToUndefined, z.string().optional()),
  processedById: z.preprocess(emptyToUndefined, z.string().optional()),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  searchTerm: z.preprocess(emptyToUndefined, z.string().optional()),
});
