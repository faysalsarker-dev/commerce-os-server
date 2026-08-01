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
  CategoryCreateInput,
  CategoryUpdateInput,
} from "../../generated/prisma/models";
import { Category } from "../../generated/prisma/client";
import generateSlug from "../../utils/slugify";

export const createCategory = async (
  payload: CategoryCreateInput,
): Promise<Category> => {
  if (!payload.name) throw new AppError("Category name is required", 400);

 const { name, slug, description, isActive, displayOrder ,image} = payload;

  const data = {
    name,
    slug,
    description,
    isActive: (isActive as unknown as string) === "true" || isActive === true,
    displayOrder: Number(displayOrder),
    image
  };


 
  const category = await createOne<Category>(prisma.category,data  as Partial<Category>);

  return category;
};

export const getCategories = async (query: Record<string, any>) => {
    if (query.isActive !== undefined) {
    query.isActive = query.isActive === "true";
  }
  const result = await getAll<Category>(prisma.category, query, [
    "name",
  ]);

  return {
    data: result.data,
    meta: result.meta,
  };
};

export const getCategoryById = async (
  categoryId: string,
): Promise<Category> => {
  const category = await getById<Category>(prisma.category, categoryId);
  return category;
};

export const updateCategoryById = async (
  categoryId: string,
  payload: CategoryUpdateInput,
): Promise<Category> => {
  let slug: string | undefined = undefined;

  if (payload.name) {
    slug = await generateSlug(
      String(payload.name),
      prisma.category,
      "slug",
      categoryId,
    );
  }

  const category = await updateOne<Category>(prisma.category, categoryId, {
    name: payload.name,
    ...(slug && { slug }),
    description: payload.description,
    image: payload.image,
    isActive: payload.isActive,
    displayOrder: payload.displayOrder,
  } as Partial<Category>);

  return category;
};

export const deleteCategoryById = async (
  categoryId: string,
): Promise<Category> => {
  const category = await deleteOne<Category>(prisma.category, categoryId);
  return category;
};
