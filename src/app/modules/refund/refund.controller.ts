import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/httpStatus";
import * as RefundService from "./refund.service";

export const createRefund = catchAsync(async (req: Request, res: Response) => {
  const result = await RefundService.createRefund({
    ...req.body,
    processedById: req.user?.id || req.body.processedById,
  });

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Refund processed successfully",
    data: result,
  });
});

export const getRefunds = catchAsync(async (req: Request, res: Response) => {
  const result = await RefundService.getRefunds(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Refunds fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getRefund = catchAsync(async (req: Request, res: Response) => {
  const refund = await RefundService.getRefundById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Refund details fetched successfully",
    data: refund,
  });
});

export const getRefundsBySale = catchAsync(async (req: Request, res: Response) => {
  const refunds = await RefundService.getRefundsBySaleId(
    req.params.saleId as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Sale refunds fetched successfully",
    data: refunds,
  });
});

export const deleteRefund = catchAsync(async (req: Request, res: Response) => {
  const refund = await RefundService.deleteRefundById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Refund record deleted successfully",
    data: refund,
  });
});
