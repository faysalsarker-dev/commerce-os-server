import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { checkAuth } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import * as UserController from "./user.controller";
import { createUserSchema, updateUserSchema } from "./user.validation";

const router = Router();

router.use(checkAuth([Role.SUPER_ADMIN]));
router.post("/", validate(createUserSchema), UserController.createUser);
router.get("/", UserController.getUsers);
router.get("/:id", UserController.getUser);
router.patch("/:id", validate(updateUserSchema), UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

export default router;
