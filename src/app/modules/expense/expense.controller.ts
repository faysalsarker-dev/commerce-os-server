import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as ExpenseService from "./expense.service";

export const createExpense = catchAsync(async (req: Request, res: Response) => {
  const expense = await ExpenseService.createExpense(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Expense created successfully",
    data: expense,
  });
});

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const result = await ExpenseService.getExpenses(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Expenses fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getExpense = catchAsync(async (req: Request, res: Response) => {
  const expense = await ExpenseService.getExpenseById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Expense fetched successfully",
    data: expense,
  });
});

export const updateExpense = catchAsync(async (req: Request, res: Response) => {
  const expense = await ExpenseService.updateExpenseById(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Expense updated successfully",
    data: expense,
  });
});

export const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  const expense = await ExpenseService.deleteExpenseById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Expense deleted successfully",
    data: expense,
  });
});
