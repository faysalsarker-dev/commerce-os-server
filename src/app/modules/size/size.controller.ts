import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as SizeService from "./size.service";

export const createSize = catchAsync(async (req: Request, res: Response) => {
  const size = await SizeService.createSize(req.body.size);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Size created successfully",
    data: size,
  });
});

export const getSizes = catchAsync(async (req: Request, res: Response) => {
  const result = await SizeService.getSizes(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Sizes fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getSize = catchAsync(async (req: Request, res: Response) => {
  const size = await SizeService.getSizeById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Size fetched successfully",
    data: size,
  });
});

export const updateSize = catchAsync(async (req: Request, res: Response) => {
  const size = await SizeService.updateSizeById(
    req.params.id as string,
    req.body.size,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Size updated successfully",
    data: size,
  });
});

export const deleteSize = catchAsync(async (req: Request, res: Response) => {
  const size = await SizeService.deleteSizeById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Size deleted successfully",
    data: size,
  });
});
