import { Router } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "./auth.validation";
import { validate } from "../../middleware/validate";
import { checkAuth } from "../../middleware/authenticate";
import * as AuthController from "./auth.controller";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/logout", checkAuth(), AuthController.logout);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), AuthController.forgotPassword);
router.patch("/reset-password", validate(resetPasswordSchema), AuthController.resetPassword);

router.get("/profile", checkAuth(), AuthController.getProfile);
router.patch("/profile", checkAuth(), validate(updateProfileSchema), AuthController.updateProfile);
router.patch("/password", checkAuth(), validate(updatePasswordSchema), AuthController.updatePassword);

export default router;
