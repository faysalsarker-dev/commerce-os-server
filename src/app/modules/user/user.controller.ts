import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import * as UserService from "./user.service";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as SalaryService from "./salary.service";

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

export const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.getUserProfile(req.user.id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "User profile fetched successfully",
    data: user,
  });
});

export const createSalaryRecord = catchAsync(
  async (req: Request, res: Response) => {
    const record = await SalaryService.createSalaryRecord(req.body);

    sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: "Salary record created successfully",
      data: record,
    });
  },
);

export const getSalaryRecords = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SalaryService.getSalaryRecords(req.query);

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Salary records fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

export const getSalaryRecord = catchAsync(
  async (req: Request, res: Response) => {
    const record = await SalaryService.getSalaryRecordById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Salary record fetched successfully",
      data: record,
    });
  },
);

export const getUserSalaryHistory = catchAsync(
  async (req: Request, res: Response) => {
    const history = await SalaryService.getUserSalaryHistory(
      req.params.userId as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Employee salary history fetched successfully",
      data: history,
    });
  },
);

export const updateSalaryRecord = catchAsync(
  async (req: Request, res: Response) => {
    const record = await SalaryService.updateSalaryRecord(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Salary record updated successfully",
      data: record,
    });
  },
);

export const deleteSalaryRecord = catchAsync(
  async (req: Request, res: Response) => {
    const record = await SalaryService.deleteSalaryRecord(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Salary record deleted successfully",
      data: record,
    });
  },
);

export const increaseEmployeeSalary = catchAsync(
  async (req: Request, res: Response) => {
    const employee = await SalaryService.increaseEmployeeSalary(req.body);

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Employee base salary increased successfully",
      data: employee,
    });
  },
);
