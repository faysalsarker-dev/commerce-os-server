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

export const courierAccountListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  provider: z.enum(["PATHAO", "STEADFAST"]).optional(),
  isActive: z.preprocess(
    (value: unknown) =>
      typeof value === "string" && ["true", "false"].includes(value)
        ? value === "true"
        : value,
    z.boolean().optional(),
  ),
});

export type PathaoCredentials = z.infer<typeof pathaoCredentialsSchema>;
export type PathaoConfig = z.infer<typeof pathaoConfigSchema>;
export type SteadfastCredentials = z.infer<typeof steadfastCredentialsSchema>;
export type SteadfastConfig = z.infer<typeof steadfastConfigSchema>;
export type TestCourierConnectionInput = z.infer<
  typeof testCourierConnectionSchema
>;
export type CreateCourierAccountInput = z.infer<
  typeof createCourierAccountSchema
>;
export type UpdateCourierAccountInput = z.infer<
  typeof updateCourierAccountSchema
>;
export type CourierAccountListQuery = z.infer<
  typeof courierAccountListQuerySchema
>;
