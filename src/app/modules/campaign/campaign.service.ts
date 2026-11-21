import { Campaign, Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";
import { z } from "zod";
import {
  createCampaignSchema,
  listCampaignsSchema,
  updateCampaignSchema,
} from "./campaign.validation";

type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const createCampaign = async (payload: CreateCampaignInput) => {
  try {
    return await createOne<Campaign>(prisma.campaign, payload);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Campaign tracking code is already in use", 409);
    }
    throw error;
  }
};

export const getCampaignById = async (id: string) => {
  return getById<Campaign>(prisma.campaign, id);
};

export const updateCampaign = async (id: string, payload: Record<string, unknown>) => {
  const current = await getCampaignById(id);
  const updates = updateCampaignSchema.parse(payload);
  const startDate = updates.startDate === undefined ? current.startDate : updates.startDate;
  const endDate = updates.endDate === undefined ? current.endDate : updates.endDate;
  if (startDate && endDate && endDate < startDate) {
    throw new AppError("End date must be on or after start date", 400);
  }
  try {
    return await updateOne<Campaign>(prisma.campaign, id, updates);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Campaign tracking code is already in use", 409);
    }
    throw error;
  }
};

export const getCampaigns = async (query: Record<string, unknown>) => {
  const filters = listCampaignsSchema.parse(query);
  return getAll<Campaign>(
    prisma.campaign,
    {
      ...filters,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    ["name", "trackingCode"],
  );
};

export const deleteCampaign = async (id: string) => {
  await getCampaignById(id);
  const [salesCount, expensesCount] = await Promise.all([
    prisma.sale.count({ where: { campaignId: id } }),
    prisma.expense.count({ where: { campaignId: id } }),
  ]);
  if (salesCount > 0 || expensesCount > 0) {
    throw new AppError(
      "Cannot delete a campaign linked to sales or expenses. Deactivate it instead.",
      409,
    );
  }

  return deleteOne<Campaign>(prisma.campaign, id);
};
