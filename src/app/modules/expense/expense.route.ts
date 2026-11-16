import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as ExpenseController from "./expense.controller";
import { createExpenseSchema, updateExpenseSchema } from "./expense.validation";

const router = Router();

router.post("/", validate(createExpenseSchema), ExpenseController.createExpense);
router.get("/", ExpenseController.getExpenses);
router.get("/:id", ExpenseController.getExpense);
router.patch("/:id", validate(updateExpenseSchema), ExpenseController.updateExpense);
router.delete("/:id", ExpenseController.deleteExpense);

export default router;
