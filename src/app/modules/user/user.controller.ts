import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import * as UserService from "./user.service";
import { HttpStatus } from "../../utils/httpStatus";

export const createUser = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.createUser(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "User created successfully",
    data: user,
  });
});

export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUsers(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getMe(req.user.id);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: result,
  });
});

export const getUser = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.getUserById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.updateUserById(req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "User updated successfully",
    data: user,
  });
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.deleteUserById(req.params.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: user,
  });
});
