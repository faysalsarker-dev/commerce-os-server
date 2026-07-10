

// ─── Types ────────────────────────────────────────────────────────────────────

import { AppError } from "../errors/AppError";
import { buildPrismaQuery } from "../utils/QueryBuilder";

type PrismaModel = {
  create: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  deleteMany: (args: any) => Promise<any>;
  updateMany: (args: any) => Promise<any>;
  createMany: (args: any) => Promise<any>;
  count: (args: any) => Promise<number>;
};

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ─── Functions ────────────────────────────────────────────────────────────────

export const createOne = async <T>(
  model: PrismaModel,
  data: Partial<T>,
  include?: Record<string, any>
): Promise<T> => {
  return model.create({ data, ...(include && { include }) });
};

// ─────────────────────────────────────────────────────────────────────────────

export const getAll = async <T>(
  model: PrismaModel,
  query: Record<string, any> = {},
  searchableFields: string[] = [],
  include?: Record<string, any>
): Promise<PaginatedResult<T>> => {
  const { where, orderBy, skip, take, page } = buildPrismaQuery<T>(
    query,
    searchableFields
  );

  const [data, total] = await Promise.all([
    model.findMany({ where, orderBy, skip, take, ...(include && { include }) }),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return {
    data,
    meta: {
      total,
      page,
      limit: take,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export const getById = async <T>(
  model: PrismaModel,
  id: string,
  include?: Record<string, any>
): Promise<T> => {
  const record = await model.findUnique({
    where: { id },
    ...(include && { include }),
  });

  if (!record) throw new AppError("Record not found.", 404);

  return record;
};

// ─────────────────────────────────────────────────────────────────────────────

export const getOne = async <T>(
  model: PrismaModel,
  where: Record<string, any>,
  include?: Record<string, any>
): Promise<T | null> => {
  return model.findFirst({ where, ...(include && { include }) });
};

// ─────────────────────────────────────────────────────────────────────────────

export const updateOne = async <T>(
  model: PrismaModel,
  id: string,
  data: Partial<T>,
  include?: Record<string, any>
): Promise<T> => {
  await getById(model, id); // ensure exists

  return model.update({
    where: { id },
    data,
    ...(include && { include }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────

export const deleteOne = async <T>(
  model: PrismaModel,
  id: string,
  include?: Record<string, any>
): Promise<T> => {
  await getById(model, id); // ensure exists

  return model.delete({
    where: { id },
    ...(include && { include }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────

export const createMany = async <T>(
  model: PrismaModel,
  data: Partial<T>[]
): Promise<{ count: number }> => {
  return model.createMany({ data });
};

// ─────────────────────────────────────────────────────────────────────────────

export const updateMany = async <T>(
  model: PrismaModel,
  where: Record<string, any>,
  data: Partial<T>
): Promise<{ count: number }> => {
  return model.updateMany({ where, data });
};

// ─────────────────────────────────────────────────────────────────────────────

export const deleteMany = async (
  model: PrismaModel,
  where: Record<string, any>
): Promise<{ count: number }> => {
  return model.deleteMany({ where });
};

// ─────────────────────────────────────────────────────────────────────────────

export const exists = async (
  model: PrismaModel,
  where: Record<string, any>
): Promise<boolean> => {
  const count = await model.count({ where });
  return count > 0;
};

// ─────────────────────────────────────────────────────────────────────────────

export const countRecords = async (
  model: PrismaModel,
  where: Record<string, any> = {}
): Promise<number> => {
  return model.count({ where });
};