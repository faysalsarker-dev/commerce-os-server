import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as CouponService from "./coupon.service";

export const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const coupon = await CouponService.createCoupon(req.body, req.user?.id);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Coupon created successfully",
    data: coupon,
  });
});

export const getCoupons = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.getCoupons(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupons fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getCoupon = catchAsync(async (req: Request, res: Response) => {
  const coupon = await CouponService.getCouponById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupon fetched successfully",
    data: coupon,
  });
});

export const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const coupon = await CouponService.updateCouponById(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupon updated successfully",
    data: coupon,
  });
});

export const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  const coupon = await CouponService.deleteCouponById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupon deleted successfully",
    data: coupon,
  });
});

export const validateCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.validateCoupon(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupon validated successfully",
    data: result,
  });
});

