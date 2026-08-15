import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import * as CategoryService from "./category.service";
import { HttpStatus } from "../../utils/httpStatus";

export const createCategory = catchAsync(
  async (req: Request, res: Response) => {

    console.log(req.body)
    const category = await CategoryService.createCategory(req.body);

    sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: "Category created successfully",
      data: category,
    });
  },
);

export const getCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategories(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Categories fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await CategoryService.getCategoryById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Category fetched successfully",
    data: category,
  });
});

export const updateCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await CategoryService.updateCategoryById(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  },
);

export const deleteCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await CategoryService.deleteCategoryById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Category deleted successfully",
      data: category,
    });
  },
);


export const getCategoryForSelect = catchAsync(
  async (req: Request, res: Response) => {
    const categories = await CategoryService.getCategoryForSelect();  
    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  })