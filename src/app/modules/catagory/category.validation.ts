import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  image: z.preprocess(
    emptyToUndefined,
    z.string().url("Image must be a valid URL").optional(),
  ),
  isActive: z.boolean().optional(),
  displayOrder: z.coerce.number().int().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.preprocess(
      emptyToUndefined,
      z.string().min(2, "Name must be at least 2 characters").optional(),
    ),
    slug: z.preprocess(
      emptyToUndefined,
      z.string().min(2, "Slug must be at least 2 characters").optional(),
    ),
    description: z.preprocess(emptyToUndefined, z.string().optional()),
    image: z.preprocess(
      emptyToUndefined,
      z.string().url("Image must be a valid URL").optional(),
    ),
    isActive: z.boolean().optional(),
    displayOrder: z.coerce.number().int().optional(),
  })
  .refine((data) => Boolean(Object.keys(data).length), {
    message: "At least one field must be provided to update category",
  });
