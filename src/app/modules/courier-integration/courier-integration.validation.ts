import { z } from "zod";

export const pathaoCredentialsSchema = z
  .object({
    clientId: z.string().trim().min(1),
    clientSecret: z.string().min(1),
    username: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const pathaoConfigSchema = z
  .object({
    storeId: z.number().int().positive(),
    sandbox: z.boolean(),
  })
  .strict();

export const steadfastCredentialsSchema = z
  .object({
    apiKey: z.string().trim().min(1),
    secretKey: z.string().min(1),
  })
  .strict();

export const steadfastConfigSchema = z.object({}).strict();

export const customerHistorySchema = z
  .object({
    phone: z
      .string()
      .trim()
      .min(1)
      .transform((phone) => phone.replace(/\D/g, ""))
      .transform((digits) => {
        if (digits.startsWith("8801")) return digits.slice(2);
        if (/^1[3-9]\d{8}$/.test(digits)) return `0${digits}`;
        return digits;
      })
      .pipe(
        z
          .string()
          .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number"),
      ),
  })
  .strict();

const shipmentFields = {
  orderId: z.string().trim().min(1),
  courierAccountId: z.string().trim().min(1).optional(),
  recipientName: z.string().trim().min(1).max(100).optional(),
  recipientPhone: z.string().trim().min(1).max(40).optional(),
  recipientAddress: z.string().trim().min(1).max(490).optional(),
  codAmount: z.number().int().nonnegative().optional(),
  itemDescription: z.string().trim().max(1000).optional(),
};

const pathaoShipmentSchema = z
  .object({
    ...shipmentFields,
    provider: z.literal("PATHAO"),
    recipientCity: z.number().int().positive(),
    recipientZone: z.number().int().positive(),
    recipientArea: z.number().int().positive().optional(),
    itemWeight: z.number().finite().positive(),
    deliveryType: z.union([z.literal(12), z.literal(48)]).default(48),
    itemType: z.union([z.literal(1), z.literal(2)]).default(2),
    specialInstruction: z.string().trim().max(250).optional(),
  })
  .strict();

const steadfastShipmentSchema = z
  .object({
    ...shipmentFields,
    provider: z.literal("STEADFAST"),
    note: z.string().trim().max(480).optional(),
  })
  .strict();

export const dispatchShipmentSchema = z.discriminatedUnion("provider", [
  pathaoShipmentSchema,
  steadfastShipmentSchema,
]);

export const courierWebhookSchema = z.record(z.string(), z.unknown());

const pathaoTestSchema = z
  .object({
    provider: z.literal("PATHAO"),
    credentials: pathaoCredentialsSchema,
    config: pathaoConfigSchema,
  })
  .strict();

const steadfastTestSchema = z
  .object({
    provider: z.literal("STEADFAST"),
    credentials: steadfastCredentialsSchema,
    config: steadfastConfigSchema.optional(),
  })
  .strict();

export const testCourierConnectionSchema = z.discriminatedUnion("provider", [
  pathaoTestSchema,
  steadfastTestSchema,
]);

const createPathaoCourierAccountSchema = z
  .object({
    provider: z.literal("PATHAO"),
    label: z.string().trim().min(1).max(100),
    credentials: pathaoCredentialsSchema,
    config: pathaoConfigSchema,
    isDefault: z.boolean().optional(),
  })
  .strict();

const createSteadfastCourierAccountSchema = z
  .object({
    provider: z.literal("STEADFAST"),
    label: z.string().trim().min(1).max(100),
    credentials: steadfastCredentialsSchema,
    config: steadfastConfigSchema.optional(),
    webhookSecret: z.string().min(1).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const createCourierAccountSchema = z.discriminatedUnion("provider", [
  createPathaoCourierAccountSchema,
  createSteadfastCourierAccountSchema,
]);

export const updateCourierAccountSchema = z
  .object({
    label: z.string().trim().min(1).max(100).optional(),
    credentials: z
      .union([pathaoCredentialsSchema, steadfastCredentialsSchema])
      .optional(),
    config: z.union([pathaoConfigSchema, steadfastConfigSchema]).optional(),
    webhookSecret: z.string().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export type PathaoCredentials = z.infer<typeof pathaoCredentialsSchema>;
export type PathaoConfig = z.infer<typeof pathaoConfigSchema>;
export type SteadfastCredentials = z.infer<typeof steadfastCredentialsSchema>;
export type SteadfastConfig = z.infer<typeof steadfastConfigSchema>;
export type CustomerHistoryInput = z.infer<typeof customerHistorySchema>;
export type DispatchShipmentInput = z.infer<typeof dispatchShipmentSchema>;
export type CourierWebhookInput = z.infer<typeof courierWebhookSchema>;
export type TestCourierConnectionInput = z.infer<
  typeof testCourierConnectionSchema
>;
export type CreateCourierAccountInput = z.infer<
  typeof createCourierAccountSchema
>;
export type UpdateCourierAccountInput = z.infer<
  typeof updateCourierAccountSchema
>;
