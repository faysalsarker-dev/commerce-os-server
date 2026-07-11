import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import * as ProductService from "./product.service";
import { HttpStatus } from "../../utils/httpStatus";

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.createProduct(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Product created successfully",
    data: product,
  });
});

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProducts(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Products fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.getProductById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product fetched successfully",
    data: product,
  });
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.updateProductById(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product updated successfully",
    data: product,
  });
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.deleteProductById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product deleted successfully",
    data: product,
  });
});
