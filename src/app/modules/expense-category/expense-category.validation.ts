import { z } from "zod";

const expenseScheduleFields = {
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().positive().optional(),
  dueDateEnabled: z.boolean().optional(),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
  daysOfMonth: z.array(z.number().int().min(1).max(31)).optional(),
  monthOfYear: z.number().int().min(1).max(12).nullable().optional(),
  expectedAmount: z.number().positive().nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderDaysBefore: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
};

const validateExpenseSchedule = (
  schedule: {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    dueDateEnabled?: boolean;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    monthOfYear?: number | null;
    startDate: Date;
    endDate?: Date | null;
  },
  context: z.RefinementCtx,
) => {
  if (schedule.endDate && schedule.endDate < schedule.startDate) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "End date must be on or after the start date",
    });
  }

  if (!schedule.dueDateEnabled) return;

  if (schedule.frequency === "WEEKLY" && !schedule.daysOfWeek?.length) {
    context.addIssue({
      code: "custom",
      path: ["daysOfWeek"],
      message: "At least one weekday is required for weekly due dates",
    });
  }
  if (
    (schedule.frequency === "MONTHLY" || schedule.frequency === "YEARLY") &&
    !schedule.daysOfMonth?.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["daysOfMonth"],
      message: "At least one day of the month is required for due dates",
    });
  }
  if (schedule.frequency === "YEARLY" && !schedule.monthOfYear) {
    context.addIssue({
      code: "custom",
      path: ["monthOfYear"],
      message: "A month is required for yearly due dates",
    });
  }
};

export const createExpenseScheduleSchema = z
  .object(expenseScheduleFields)
  .superRefine(validateExpenseSchedule);

export const updateExpenseScheduleSchema = z
  .object(expenseScheduleFields)
  .partial();

export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
  schedule: createExpenseScheduleSchema.optional(),
});

export const updateExpenseCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Category name cannot be empty").optional(),
    description: z.string().trim().nullable().optional(),
    isActive: z.boolean().optional(),
    schedule: updateExpenseScheduleSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the category",
  });
