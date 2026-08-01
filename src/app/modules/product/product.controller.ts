import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/httpStatus";
import * as ProductService from "./product.service";

const uploadedFiles = (req: Request) =>
  (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];

export const createProduct = catchAsync(
  async (req: Request, res: Response) => {
    const product = await ProductService.createProduct(req.body);
    sendResponse(res, { statusCode: HttpStatus.CREATED, success: true, message: "Product created successfully", data: product });
  },
);

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProducts(req.query);
  sendResponse(res, { statusCode: HttpStatus.OK, success: true, message: "Products fetched successfully", data: result.data, meta: result.meta });
});

export const getProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.getProductById(req.params.id as string);
  sendResponse(res, { statusCode: HttpStatus.OK, success: true, message: "Product fetched successfully", data: product });
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.updateProductById(req.params.id as string, req.body);
  sendResponse(res, { statusCode: HttpStatus.OK, success: true, message: "Product updated successfully", data: product });
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.deleteProductById(req.params.id as string);
  sendResponse(res, { statusCode: HttpStatus.OK, success: true, message: "Product deleted successfully", data: product });
});

export const createColor = catchAsync(async (req: Request, res: Response) => {
  console.log(req.body,'body data')
  console.log(req.files,'files')
  const color = await ProductService.createColor(req.params.productId as string, req.body, uploadedFiles(req));
  sendResponse(res, { statusCode: HttpStatus.CREATED, success: true, message: "Product color created successfully", data: color });
});

export const updateColor = catchAsync(async (req: Request, res: Response) => {
  const color = await ProductService.updateColor(req.params.id as string, req.body, uploadedFiles(req));
  sendResponse(res, { statusCode: HttpStatus.OK, success: true, message: "Product color updated successfully", data: color });
});

export const deleteColor = catchAsync(async (req: Request, res: Response) => {
  const color = await ProductService.deleteColor(req.params.id as string);
  sendResponse(res, { statusCode: HttpStatus.OK, success: true, message: "Product color deleted successfully", data: color });
});

export const createVariant = catchAsync(async (req: Request, res: Response) => {
  const variant = await ProductService.createVariant(req.params.colorId as string, req.body);
  sendResponse(res, { statusCode: HttpStatus.CREATED, success: true, message: "Product variant created successfully", data: variant });
});

export const updateVariant = catchAsync(async (req: Request, res: Response) => {
  const variant = await ProductService.updateVariant(req.params.id as string, req.body);
  sendResponse(res, { statusCode: HttpStatus.OK, success: true, message: "Product variant updated successfully", data: variant });
});

export const deleteVariant = catchAsync(async (req: Request, res: Response) => {
  const variant = await ProductService.deleteVariant(req.params.id as string);
  sendResponse(res, { statusCode: HttpStatus.OK, success: true, message: "Product variant deleted successfully", data: variant });
});

export const createStockMovement = catchAsync(async (req: Request, res: Response) => {
  const movement = await ProductService.createStockMovement(req.params.id as string, req.body);
  sendResponse(res, { statusCode: HttpStatus.CREATED, success: true, message: "Stock movement created successfully", data: movement });
});
