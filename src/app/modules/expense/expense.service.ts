import { Expense, Prisma } from "../../generated/prisma/client";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";
import { createExpenseSchema, updateExpenseSchema } from "./expense.validation";
import { z } from "zod";

type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

const ensureCategoryExists = async (categoryId: string): Promise<void> => {
  const category = await prisma.expenseCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new AppError("Expense category not found", 404);
  }
};

const ensureScheduleMatchesCategory = async (
  scheduleId: string | null | undefined,
  categoryId: string,
): Promise<void> => {
  if (!scheduleId) return;

  const schedule = await prisma.expenseSchedule.findUnique({
    where: { id: scheduleId },
    select: { categoryId: true },
  });
  if (!schedule) {
    throw new AppError("Expense schedule not found", 404);
  }
  if (schedule.categoryId !== categoryId) {
    throw new AppError("Expense schedule must belong to the selected category", 400);
  }
};

export const createExpense = async (
  payload: CreateExpenseInput,
): Promise<Expense> => {
  await ensureCategoryExists(payload.categoryId);
  await ensureScheduleMatchesCategory(payload.scheduleId, payload.categoryId);
  return createOne<Expense>(
    prisma.expense,
    { ...payload, amount: new Prisma.Decimal(payload.amount) },
    { category: true, schedule: true },
  );
};

export const getExpenses = async (query: Record<string, any>) => {
  return getAll<Expense>(prisma.expense, query, ["description", "note"], {
    category: true,
    schedule: true,
  });
};

export const getExpenseById = async (id: string): Promise<Expense> =>
  getById<Expense>(prisma.expense, id, { category: true, schedule: true });

export const updateExpenseById = async (
  id: string,
  payload: UpdateExpenseInput,
): Promise<Expense> => {
  const currentExpense = await getById<Expense>(prisma.expense, id);
  const categoryId = payload.categoryId ?? currentExpense.categoryId;
  const scheduleId =
    payload.scheduleId === undefined ? currentExpense.scheduleId : payload.scheduleId;

  if (payload.categoryId) await ensureCategoryExists(categoryId);
  await ensureScheduleMatchesCategory(scheduleId, categoryId);

  const { amount, ...updates } = payload;
  return updateOne<Expense>(
    prisma.expense,
    id,
    {
      ...updates,
      ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
    },
    { category: true, schedule: true },
  );
};

export const deleteExpenseById = async (id: string): Promise<Expense> =>
  deleteOne<Expense>(prisma.expense, id, { category: true, schedule: true });
