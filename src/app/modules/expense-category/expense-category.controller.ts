import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as ExpenseCategoryService from "./expense-category.service";

export const createExpenseCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await ExpenseCategoryService.createExpenseCategory(req.body);

    sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: "Expense category created successfully",
      data: category,
    });
  },
);

export const getExpenseCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ExpenseCategoryService.getExpenseCategories(req.query);

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Expense categories fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

export const getExpenseCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await ExpenseCategoryService.getExpenseCategoryById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Expense category fetched successfully",
      data: category,
    });
  },
);

export const updateExpenseCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await ExpenseCategoryService.updateExpenseCategoryById(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Expense category updated successfully",
      data: category,
    });
  },
);

export const deleteExpenseCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await ExpenseCategoryService.deleteExpenseCategoryById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Expense category deleted successfully",
      data: category,
    });
  },
);
