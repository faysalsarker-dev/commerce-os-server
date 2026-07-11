import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";
import {
  ProductUncheckedCreateInput,
  ProductUncheckedUpdateInput,
} from "../../generated/prisma/models";
import { Product } from "../../generated/prisma/client";

const productInclude = {
  category: true,
  colors: {
    include: {
      variants: true,
    },
  },
};

export const createProduct = async (
  payload: ProductUncheckedCreateInput,
): Promise<Product> => {
  if (!payload.name) {
    throw new AppError("Product name is required", 400);
  }

  if (payload.costPrice === undefined || payload.costPrice === null) {
    throw new AppError("Cost price is required", 400);
  }

  if (payload.sellingPrice === undefined || payload.sellingPrice === null) {
    throw new AppError("Selling price is required", 400);
  }

  const product = await createOne<Product>(
    prisma.product,
    {
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId,
      costPrice: payload.costPrice,
      sellingPrice: payload.sellingPrice,
    } as Partial<Product>,
    productInclude,
  );

  return product;
};

export const getProducts = async (query: Record<string, any>) => {
  const result = await getAll<Product>(
    prisma.product,
    query,
    ["name", "description"],
    productInclude,
  );

  return {
    data: result.data,
    meta: result.meta,
  };
};

export const getProductById = async (productId: string): Promise<Product> => {
  const product = await getById<Product>(prisma.product, productId, productInclude);
  return product;
};

export const updateProductById = async (
  productId: string,
  payload: ProductUncheckedUpdateInput,
): Promise<Product> => {
  const product = await updateOne<Product>(
    prisma.product,
    productId,
    {
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId,
      costPrice: payload.costPrice,
      sellingPrice: payload.sellingPrice,
    } as Partial<Product>,
    productInclude,
  );

  return product;
};

export const deleteProductById = async (productId: string): Promise<Product> => {
  const product = await deleteOne<Product>(prisma.product, productId, productInclude);
  return product;
};
