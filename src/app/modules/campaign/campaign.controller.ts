import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import { HttpStatus } from "../../utils/network/httpStatus";
import * as CampaignService from "./campaign.service";

export const createCampaign = catchAsync(async (req: Request, res: Response) => {
  const campaign = await CampaignService.createCampaign(req.body);
  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Campaign created successfully",
    data: campaign,
  });
});

export const getCampaigns = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getCampaigns(req.query as Record<string, unknown>);
  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Campaigns fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getCampaign = catchAsync(async (req: Request, res: Response) => {
  const campaign = await CampaignService.getCampaignById(req.params.id as string);
  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Campaign fetched successfully",
    data: campaign,
  });
});

export const updateCampaign = catchAsync(async (req: Request, res: Response) => {
  const campaign = await CampaignService.updateCampaign(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Campaign updated successfully",
    data: campaign,
  });
});

export const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
  const campaign = await CampaignService.deleteCampaign(req.params.id as string);
  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Campaign deleted successfully",
    data: campaign,
  });
});

