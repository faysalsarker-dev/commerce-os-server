import { ExpenseCategory, Prisma } from "../../generated/prisma/client";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  deleteOne,
  getAll,
} from "../../services/base.service";
import {
  createExpenseCategorySchema,
  createExpenseScheduleSchema,
  updateExpenseCategorySchema,
} from "./expense-category.validation";
import { z } from "zod";

type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>;

export const createExpenseCategory = async (
  payload: CreateExpenseCategoryInput,
): Promise<ExpenseCategory> => {
  const existing = await prisma.expenseCategory.findUnique({
    where: { name: payload.name },
  });
  if (existing) {
    throw new AppError(`Expense category "${payload.name}" already exists`, 409);
  }

  const { schedule, ...categoryData } = payload;
  return prisma.$transaction((tx) =>
    tx.expenseCategory.create({
      data: {
        ...categoryData,
        ...(schedule && {
          schedule: {
            create: {
              ...schedule,
              ...(schedule.expectedAmount !== undefined && {
                expectedAmount:
                  schedule.expectedAmount === null
                    ? null
                    : new Prisma.Decimal(schedule.expectedAmount),
              }),
            },
          },
        }),
      },
      include: { schedule: true },
    }),
  );
};

export const getExpenseCategories = async (query: Record<string, any>) => {
  return getAll<ExpenseCategory>(prisma.expenseCategory, query, [
    "name",
    "description",
  ], { schedule: true });
};

export const getExpenseCategoryById = async (
  id: string,
): Promise<ExpenseCategory> => {
  const category = await prisma.expenseCategory.findUnique({
    where: { id },
    include: { schedule: true },
  });
  if (!category) throw new AppError("Record not found.", 404);
  return category;
};

export const updateExpenseCategoryById = async (
  id: string,
  payload: UpdateExpenseCategoryInput,
): Promise<ExpenseCategory> => {
  if (payload.name) {
    const existing = await prisma.expenseCategory.findUnique({
      where: { name: payload.name },
    });
    if (existing && existing.id !== id) {
      throw new AppError(`Expense category "${payload.name}" already exists`, 409);
    }
  }

  const current = await prisma.expenseCategory.findUnique({
    where: { id },
    include: { schedule: true },
  });
  if (!current) throw new AppError("Record not found.", 404);

  const { schedule, ...categoryData } = payload;
  let validatedSchedule: z.infer<typeof createExpenseScheduleSchema> | undefined;
  if (schedule !== undefined && schedule !== null) {
    const mergedSchedule = {
      ...current.schedule,
      ...schedule,
      expectedAmount:
        schedule.expectedAmount !== undefined
          ? schedule.expectedAmount
          : current.schedule?.expectedAmount?.toNumber() ?? null,
    };
    const validation = createExpenseScheduleSchema.safeParse(mergedSchedule);
    if (!validation.success) {
      throw new AppError(
        validation.error.issues[0]?.message ?? "Invalid expense schedule",
        400,
      );
    }
    validatedSchedule = validation.data;
  }

  return prisma.$transaction(async (tx) => {
    if (schedule === null && current.schedule) {
      await tx.expenseSchedule.delete({ where: { id: current.schedule.id } });
    } else if (schedule) {
      const { expectedAmount, ...scheduleData } = schedule;
      const data = {
        ...scheduleData,
        ...(expectedAmount !== undefined && {
          expectedAmount:
            expectedAmount === null ? null : new Prisma.Decimal(expectedAmount),
        }),
      };

      if (current.schedule) {
        await tx.expenseSchedule.update({
          where: { id: current.schedule.id },
          data,
        });
      } else {
        if (!validatedSchedule) {
          throw new AppError("A complete schedule configuration is required", 400);
        }
        const {
          expectedAmount: validatedExpectedAmount,
          ...validatedScheduleData
        } = validatedSchedule;
        await tx.expenseSchedule.create({
          data: {
            ...validatedScheduleData,
            ...(validatedExpectedAmount !== undefined && {
              expectedAmount:
                validatedExpectedAmount === null
                  ? null
                  : new Prisma.Decimal(validatedExpectedAmount),
            }),
            categoryId: id,
          },
        });
      }
    }

    return tx.expenseCategory.update({
      where: { id },
      data: categoryData,
      include: { schedule: true },
    });
  });
};

export const deleteExpenseCategoryById = async (
  id: string,
): Promise<ExpenseCategory> => {
  const expenseCount = await prisma.expense.count({ where: { categoryId: id } });
  const scheduleCount = await prisma.expenseSchedule.count({
    where: { categoryId: id },
  });
  if (expenseCount > 0 || scheduleCount > 0) {
    throw new AppError(
      "Cannot delete an expense category that has expenses or a schedule",
      409,
    );
  }

  return deleteOne<ExpenseCategory>(prisma.expenseCategory, id);
};
