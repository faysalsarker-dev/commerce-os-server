import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/httpStatus";
import * as CustomerService from "./customer.service";

export const createCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await CustomerService.createCustomer(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Customer created successfully",
    data: customer,
  });
});

export const getCustomers = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerService.getCustomers(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Customers fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await CustomerService.getCustomerById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Customer details fetched successfully",
    data: customer,
  });
});

export const getCustomerByPhone = catchAsync(async (req: Request, res: Response) => {
  const customer = await CustomerService.getCustomerByPhone(
    req.params.phone as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: customer ? "Customer found successfully" : "Customer not found",
    data: customer,
  });
});

export const updateCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await CustomerService.updateCustomerById(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Customer updated successfully",
    data: customer,
  });
});

export const deleteCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await CustomerService.deleteCustomerById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Customer deleted successfully",
    data: customer,
  });
});
