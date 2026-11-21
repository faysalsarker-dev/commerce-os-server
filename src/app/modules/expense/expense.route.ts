import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as ExpenseController from "./expense.controller";
import { createExpenseSchema, updateExpenseSchema } from "./expense.validation";
import { Role } from "../../generated/prisma/enums";
import { checkAuth } from "../../middleware/authenticate";

const router = Router();

router.use(checkAuth());
router.post(
  "/",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.MARKETER]),
  validate(createExpenseSchema),
  ExpenseController.createExpense,
);
router.get("/", ExpenseController.getExpenses);
router.get("/:id", ExpenseController.getExpense);
router.patch(
  "/:id",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.MARKETER]),
  validate(updateExpenseSchema),
  ExpenseController.updateExpense,
);
router.delete(
  "/:id",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  ExpenseController.deleteExpense,
);

export default router;
