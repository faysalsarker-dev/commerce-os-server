import { z } from "zod";
import { Platform } from "../../generated/prisma/enums";

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(160),
  platform: z.nativeEnum(Platform),
  trackingCode: z.string().trim().min(1).max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
  isCampEnd: z.boolean().optional(),
}).refine(
  (value) => !value.startDate || !value.endDate || value.endDate >= value.startDate,
  { message: "End date must be on or after start date", path: ["endDate"] },
);

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  platform: z.nativeEnum(Platform).optional(),
  trackingCode: z.string().trim().min(1).max(200).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  isCampEnd: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one campaign field must be provided",
});

export const listCampaignsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  platform: z.nativeEnum(Platform).optional(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  isCampEnd: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  searchTerm: z.string().trim().max(100).optional(),
});

