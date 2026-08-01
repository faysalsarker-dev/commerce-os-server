import { Router } from "express";
import * as CategoryController from "./category.controller";
import { validate } from "../../middleware/validate";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";
import { multerUpload } from "../../config/multer.config";

const router = Router();

router.post(
  "/",
  multerUpload.single("image"),
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
