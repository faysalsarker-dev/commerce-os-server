import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as OrderService from "./order.service";

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await OrderService.createOrder(req.body, req.user?.id);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Order created successfully",
    data: order,
  });
});

export const getOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getOrders(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Orders fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await OrderService.getOrderById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order fetched successfully",
    data: order,
  });
});

export const updateOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await OrderService.updateOrderById(
    req.params.id as string,
    req.body,
    req.user?.id,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order updated successfully",
    data: order,
  });
});

export const deleteOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await OrderService.deleteOrderById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order deleted successfully",
    data: order,
  });
});
