import { z } from "zod";
import {
  PaymentStatus,
  SaleChannel,
  SaleStatus,
} from "../../generated/prisma/enums";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);
const paymentMethodSchema = z.enum([
  "CASH",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "CARD",
  "BANK_TRANSFER",
]);

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
      "MIX",
    ])
    .default("CASH"),
  payments: z
    .array(
      z.object({
        method: paymentMethodSchema,
        amount: z.coerce.number().positive("Payment amount must be greater than 0"),
        reference: z.preprocess(emptyToUndefined, z.string().optional()),
      }),
    )
    .min(1, "At least one payment is required")
    .optional(),
  isFullPayment: z.boolean().default(true),
  paidAmount: z.coerce.number().min(0).optional(),
  dueAmount: z.coerce.number().min(0).optional(),
  dueDate: z.preprocess(emptyToUndefined, z.string().optional()),
  customerName: z.preprocess(emptyToUndefined, z.string().optional()),
  customerPhone: z.preprocess(emptyToUndefined, z.string().optional()),
  customerId: z.preprocess(emptyToUndefined, z.string().optional()),
  campaignId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  utmSource: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  utmMedium: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  utmCampaign: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  utmContent: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  utmTerm: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  soldById: z.preprocess(emptyToUndefined, z.string().optional()),
  channel: z.nativeEnum(SaleChannel).optional().default(SaleChannel.OFFLINE),
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

export const salesHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    searchTerm: z.string().trim().max(100).optional(),
    channel: z.nativeEnum(SaleChannel).optional(),
    status: z.nativeEnum(SaleStatus).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    sortBy: z
      .enum(["createdAt", "invoiceNo", "channel", "status", "subtotal", "discount", "total"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    ({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo,
    { message: "dateFrom must be on or before dateTo", path: ["dateFrom"] },
  );

