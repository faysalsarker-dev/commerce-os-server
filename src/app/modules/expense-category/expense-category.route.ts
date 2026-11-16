import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as ExpenseCategoryController from "./expense-category.controller";
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
} from "./expense-category.validation";

const router = Router();

router.post(
  "/",
  validate(createExpenseCategorySchema),
  ExpenseCategoryController.createExpenseCategory,
);
router.get("/", ExpenseCategoryController.getExpenseCategories);
router.get("/:id", ExpenseCategoryController.getExpenseCategory);
router.patch(
  "/:id",
  validate(updateExpenseCategorySchema),
  ExpenseCategoryController.updateExpenseCategory,
);
router.delete("/:id", ExpenseCategoryController.deleteExpenseCategory);

export default router;
