import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/httpStatus";
import * as SalesService from "./sales.service";

export const scanProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await SalesService.scanProduct(req.body.code);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product scanned successfully",
    data: result,
  });
});

export const checkoutSale = catchAsync(async (req: Request, res: Response) => {
  const result = await SalesService.checkoutSale({
    ...req.body,
    soldById: req.user?.id || req.body.soldById,
  });

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Sale completed successfully",
    data: result,
  });
});

export const returnProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await SalesService.returnProduct(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product returned successfully",
    data: result,
  });
});

export const getSalesHistory = catchAsync(async (_req: Request, res: Response) => {
  const result = await SalesService.getSalesHistory();

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Sales history fetched successfully",
    data: result,
  });
});


export const getSaleByInvoiceNumber = catchAsync(async (req: Request, res: Response) => {
  const result = await SalesService.getSaleByInvoiceNumber(req.params.invoiceNo as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Sale fetched successfully",
    data: result,
  });
});
