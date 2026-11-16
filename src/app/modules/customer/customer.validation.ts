import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const updateCustomerSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().optional()),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
}).refine((data) => data.name !== undefined || data.phone !== undefined, {
  message: "At least one customer field must be provided",
});

export const customerPaymentSchema = z.object({
  saleId: z.string().min(1, "Sale ID is required"),
  amount: z.coerce
    .number()
    .finite()
    .positive("Payment amount must be greater than 0")
    .refine(
      (amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8,
      "Payment amount can have at most 2 decimal places",
    ),
  method: z.enum([
    "CASH",
    "BKASH",
    "NAGAD",
    "ROCKET",
    "CARD",
    "BANK_TRANSFER",
  ]),
  reference: z.preprocess(emptyToUndefined, z.string().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
});
