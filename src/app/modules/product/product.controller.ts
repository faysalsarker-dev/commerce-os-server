import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import * as ProductService from "./product.service";
import { HttpStatus } from "../../utils/httpStatus";

// ==================== STEP 1: BASE PRODUCT CONTAINER ====================

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.createProduct(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Product container created successfully",
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

// ==================== STEP 2: PRODUCT COLOR ====================

export const addProductColor = catchAsync(async (req: Request, res: Response) => {
  const color = await ProductService.addProductColor(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Product color added successfully",
    data: color,
  });
});

export const updateProductColor = catchAsync(async (req: Request, res: Response) => {
  const color = await ProductService.updateProductColor(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product color updated successfully",
    data: color,
  });
});

export const deleteProductColor = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.deleteProductColor(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

// ==================== STEP 3: PRODUCT VARIANT ====================

export const addProductVariant = catchAsync(async (req: Request, res: Response) => {
  const variant = await ProductService.addProductVariant(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Product variant added successfully",
    data: variant,
  });
});

export const updateProductVariant = catchAsync(async (req: Request, res: Response) => {
  const variant = await ProductService.updateProductVariant(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product variant updated successfully",
    data: variant,
  });
});

export const deleteProductVariant = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.deleteProductVariant(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});
