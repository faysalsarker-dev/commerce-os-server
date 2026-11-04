import { Size } from "../../generated/prisma/client";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";

export const createSize = async (size: string): Promise<Size> => {
  const existingSize = await prisma.size.findUnique({ where: { size } });
  if (existingSize) {
    throw new AppError(`Size "${size}" already exists`, 400);
  }

  return createOne<Size>(prisma.size, { size });
};

export const getSizes = async (query: Record<string, any>) => {
  const result = await getAll<Size>(prisma.size, query, ["size"]);
  return { data: result.data, meta: result.meta };
};

export const getSizeById = async (sizeId: string): Promise<Size> => {
  return getById<Size>(prisma.size, sizeId);
};

export const updateSizeById = async (
  sizeId: string,
  newSize: string,
): Promise<Size> => {
  const duplicateSize = await prisma.size.findUnique({
    where: { size: newSize },
  });

  if (duplicateSize && duplicateSize.id !== sizeId) {
    throw new AppError(`Size "${newSize}" already exists`, 400);
  }

  return updateOne<Size>(prisma.size, sizeId, { size: newSize });
};

export const deleteSizeById = async (sizeId: string): Promise<Size> => {
  const variantCount = await prisma.productVariant.count({
    where: { sizeId },
  });

  if (variantCount > 0) {
    throw new AppError("Cannot delete a size that is used by product variants", 409);
  }

  return deleteOne<Size>(prisma.size, sizeId);
};
