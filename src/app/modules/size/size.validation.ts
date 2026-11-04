import { z } from "zod";

export const createSizeSchema = z.object({
  size: z.string().trim().min(1, "Size is required"),
});

export const updateSizeSchema = z
  .object({
    size: z.string().trim().min(1, "Size cannot be empty").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update size",
  });
