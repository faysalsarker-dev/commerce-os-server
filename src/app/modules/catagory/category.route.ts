import { Router } from "express";
import * as CategoryController from "./category.controller";
import { validate } from "../../middleware/validate";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";

const router = Router();

router.post(
  "/",
  validate(createCategorySchema),
  CategoryController.createCategory,
);
router.get("/", CategoryController.getCategories);
router.get("/:id", CategoryController.getCategory);
router.patch(
  "/:id",
  validate(updateCategorySchema),
  CategoryController.updateCategory,
);
router.delete("/:id", CategoryController.deleteCategory);

export default router;
