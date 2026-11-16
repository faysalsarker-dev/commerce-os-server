import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as CourierIntegrationService from "./courier-integration.service";

export const getCourierAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CourierIntegrationService.getCourierAccounts(
      req.query,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier accounts fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

export const createCourierAccount = catchAsync(
  async (req: Request, res: Response) => {
    const account = await CourierIntegrationService.createCourierAccount(
      req.body,
    );

    sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: "Courier account connected successfully",
      data: account,
    });
  },
);

export const getCourierAccount = catchAsync(
  async (req: Request, res: Response) => {
    const account = await CourierIntegrationService.getCourierAccountById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier account fetched successfully",
      data: account,
    });
  },
);

export const updateCourierAccount = catchAsync(
  async (req: Request, res: Response) => {
    const account = await CourierIntegrationService.updateCourierAccountById(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier account updated successfully",
      data: account,
    });
  },
);

export const deleteCourierAccount = catchAsync(
  async (req: Request, res: Response) => {
    const account = await CourierIntegrationService.deleteCourierAccountById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier account deleted successfully",
      data: account,
    });
  },
);

export const testCourierConnection = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CourierIntegrationService.testCourierConnection(
      req.body,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier connection test succeeded",
      data: result,
    });
  },
);

export const regenerateWebhookSecret = catchAsync(
  async (req: Request, res: Response) => {
    const account =
      await CourierIntegrationService.regeneratePathaoWebhookSecret(
        req.params.id as string,
      );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Webhook secret regenerated. Store it securely; it will not be shown again.",
      data: account,
    });
  },
);
