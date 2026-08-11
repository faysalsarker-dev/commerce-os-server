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
import { deleteEntityImages, handleImageUpdate } from "../../utils/imageUtils";

export const createCategory = async (
  payload: CategoryCreateInput,
): Promise<Category> => {
  if (!payload.name) throw new AppError("Category name is required", 400);

  const slug = await generateSlug(
    String(payload.name),
    prisma.category,
    "slug",
  );

  const category = await createOne<Category>(prisma.category, {
    name: payload.name,
    slug,
    description: payload.description,
    image: payload.image,
    isActive: payload.isActive,
    displayOrder: payload.displayOrder,
  } as Partial<Category>);

  return category;
};

export const getCategories = async (query: Record<string, any>) => {
  const result = await getAll<Category>(prisma.category, query, [
    "name",
    "slug",
    "description",
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
  const existingCategory = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!existingCategory) {
    throw new AppError("Category not found", 404);
  }

  let slug: string | undefined = undefined;

  if (payload.name) {
    slug = await generateSlug(
      String(payload.name),
      prisma.category,
      "slug",
      categoryId,
    );
  }

  // Delete removed old image from Cloudinary
  await handleImageUpdate(existingCategory, payload, "image");

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
  const existingCategory = await getById<Category>(prisma.category, categoryId);
  await deleteEntityImages(existingCategory, "image");

  const category = await deleteOne<Category>(prisma.category, categoryId);
  return category;
};
