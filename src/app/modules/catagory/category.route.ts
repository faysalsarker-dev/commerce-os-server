import { Router } from "express";
import * as CategoryController from "./category.controller";
import { validate } from "../../middleware/validate";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";
import { uploadHandler } from "../../utils/upload-handler";

const router = Router();

router.post(
  "/",
  ...uploadHandler(),
  validate(createCategorySchema),
  CategoryController.createCategory,
);

router.get("/", CategoryController.getCategories);
router.get("/select", CategoryController.getCategoryForSelect);
router.get("/:id", CategoryController.getCategory);
router.patch(
  "/:id",
    ...uploadHandler(),
  validate(updateCategorySchema),
  CategoryController.updateCategory,
);
router.delete("/:id", CategoryController.deleteCategory);

export default router;
