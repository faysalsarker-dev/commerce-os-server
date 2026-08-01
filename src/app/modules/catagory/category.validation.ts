import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  description: z.string().optional(),
  image: z.string().url("Image must be a valid URL").optional(),
  isActive: z.string().optional,
  displayOrder: z.number().int().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    slug: z.string().min(2, "Slug must be at least 2 characters").optional(),
    description: z.string().optional(),
    image: z.string().url("Image must be a valid URL").optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  })
  .refine((data) => Boolean(Object.keys(data).length), {
    message: "At least one field must be provided to update category",
  });
