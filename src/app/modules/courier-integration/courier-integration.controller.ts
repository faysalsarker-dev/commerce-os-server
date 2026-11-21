import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as CourierIntegrationService from "./courier-integration.service";
import * as CourierWebhookService from "./courier-webhook.service";
import * as ShipmentService from "./shipment.service";
import type {
  CustomerHistoryInput,
  CreateCourierAccountInput,
  DispatchShipmentInput,
  TestCourierConnectionInput,
  UpdateCourierAccountInput,
} from "./courier-integration.validation";

export const getCourierAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CourierIntegrationService.getCourierAccounts(
      req.query as unknown as Record<string, unknown>,
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
      req.body as CreateCourierAccountInput,
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
      req.body as UpdateCourierAccountInput,
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
      req.body as TestCourierConnectionInput,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier connection test succeeded",
      data: result,
    });
  },
);

export const getCourierCustomerHistory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CourierIntegrationService.getCourierCustomerHistory(
      (req.body as CustomerHistoryInput).phone,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier customer history fetched successfully",
      data: result,
    });
  },
);

export const dispatchCourierShipment = catchAsync(
  async (req: Request, res: Response) => {
    const shipment = await ShipmentService.dispatchCourierShipment(
      req.body as DispatchShipmentInput,
    );

    sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: "Courier shipment created successfully",
      data: shipment,
    });
  },
);

export const getCourierShipment = catchAsync(
  async (req: Request, res: Response) => {
    const shipment = await ShipmentService.getCourierShipmentById(
      req.params.shipmentId as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier shipment fetched successfully",
      data: shipment,
    });
  },
);

export const getCourierWebhookLogs = catchAsync(
  async (req: Request, res: Response) => {
    const logs = await CourierWebhookService.getCourierWebhookLogs(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: "Courier webhook logs fetched successfully",
      data: logs,
    });
  },
);

export const regenerateWebhookSecret = catchAsync(
  async (req: Request, res: Response) => {
    const account =
      await CourierIntegrationService.regenerateCourierWebhookSecret(
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
