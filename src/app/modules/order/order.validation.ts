import { z } from "zod";
import { OrderStatus, SaleChannel } from "../../generated/prisma/enums";

const requiredId = z.string().trim().min(1, "ID is required");

export const createOrderSchema = z.object({
  customerId: requiredId,
  saleId: requiredId,
});

export const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.nativeEnum(OrderStatus).optional(),
  channel: z.nativeEnum(SaleChannel).optional(),
  customerId: requiredId.optional(),
  saleId: requiredId.optional(),
  campaignId: requiredId.optional(),
  searchTerm: z.string().trim().max(100).optional(),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
