import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { checkAuth } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import * as UserController from "./user.controller";
import { createUserSchema, updateUserSchema } from "./user.validation";
import { uploadHandler } from "../../utils/helper/upload-handler";

const router = Router();
router.get("/profile", checkAuth(), UserController.getUserProfile);
router.use(checkAuth([Role.SUPER_ADMIN]));
router.post("/",
    ...uploadHandler(),


    validate(createUserSchema), UserController.createUser);
router.get("/", UserController.getUsers);
router.get("/:id", UserController.getUser);
router.patch("/:id",
    ...uploadHandler(),


    validate(updateUserSchema), UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

export default router;
