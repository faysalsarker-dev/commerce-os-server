import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.coerce.number().positive("Cost price must be greater than 0"),
  sellingPrice: z.coerce.number().positive("Selling price must be greater than 0"),
});

export const updateProductSchema = z
  .object({
    name: z
      .string()
      .min(2, "Product name must be at least 2 characters")
      .optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    costPrice: z.coerce.number().positive("Cost price must be greater than 0").optional(),
    sellingPrice: z.coerce.number().positive("Selling price must be greater than 0").optional(),
  })
  .refine((data) => Boolean(Object.keys(data).length), {
    message: "At least one field must be provided to update product",
  });
