import { z } from "zod";

export const createExpenseSchema = z.object({
  categoryId: z.string().trim().min(1, "Expense category is required"),
  scheduleId: z.string().trim().min(1).nullable().optional(),
  amount: z.number().positive("Amount must be greater than zero"),
  expenseDate: z.coerce.date().optional(),
  description: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});

export const updateExpenseSchema = z
  .object({
    categoryId: z.string().trim().min(1, "Expense category is required").optional(),
    scheduleId: z.string().trim().min(1).nullable().optional(),
    amount: z.number().positive("Amount must be greater than zero").optional(),
    expenseDate: z.coerce.date().optional(),
    description: z.string().trim().nullable().optional(),
    note: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the expense",
  });
