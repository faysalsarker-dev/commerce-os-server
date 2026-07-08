import { buildPrismaQuery } from "../utils/QueryBuilder";
import prisma  from "../lib/prisma"

export const getAllFromDB = async (
  modelName: Uncapitalize<any>, 
  query: Record<string, any>,
  searchableFields: string[] = []
) => {
  const { where, orderBy, skip, take, page } = buildPrismaQuery(query, searchableFields);

  // Execute both queries in parallel for performance
  const [data, total] = await Promise.all([
    (prisma as any)[modelName].findMany({ where, orderBy, skip, take }),
    (prisma as any)[modelName].count({ where }),
  ]);

  return {
    meta: {
      page,
      limit: take,
      total,
      totalPage: Math.ceil(total / take),
    },
    data,
  };
};