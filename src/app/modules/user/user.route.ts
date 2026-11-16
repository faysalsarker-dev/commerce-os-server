import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { checkAuth } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import * as UserController from "./user.controller";
import {
  createSalaryRecordSchema,
  createUserSchema,
  increaseSalarySchema,
  updateSalaryRecordSchema,
  updateUserSchema,
} from "./user.validation";
import { uploadHandler } from "../../utils/helper/upload-handler";

const router = Router();
router.get("/profile", checkAuth(), UserController.getUserProfile);
router.use(checkAuth([Role.SUPER_ADMIN]));
router.post("/",
    ...uploadHandler(),


    validate(createUserSchema), UserController.createUser);
router.post(
    "/salary/increase",
    validate(increaseSalarySchema),
    UserController.increaseEmployeeSalary,
);
router.post(
    "/salary",
    validate(createSalaryRecordSchema),
    UserController.createSalaryRecord,
);
router.get("/salary", UserController.getSalaryRecords);
router.get("/salary/:id", UserController.getSalaryRecord);
router.patch(
    "/salary/:id",
    validate(updateSalaryRecordSchema),
    UserController.updateSalaryRecord,
);
router.delete("/salary/:id", UserController.deleteSalaryRecord);
router.get("/:userId/salary", UserController.getUserSalaryHistory);
router.get("/", UserController.getUsers);
router.get("/:id", UserController.getUser);
router.patch("/:id",
    ...uploadHandler(),


    validate(updateUserSchema), UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

export default router;
