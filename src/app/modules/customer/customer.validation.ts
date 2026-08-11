import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const updateCustomerSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().optional()),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
});
