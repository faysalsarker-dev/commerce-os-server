import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { checkAuth } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import * as CouponController from "./coupon.controller";
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./coupon.validation";

const router = Router();

router.post(
  "/",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  validate(createCouponSchema),
  CouponController.createCoupon,
);

router.get("/", checkAuth(), CouponController.getCoupons);

router.post(
  "/validate",
  checkAuth(),
  validate(validateCouponSchema),
  CouponController.validateCoupon,
);

router.get("/:id", checkAuth(), CouponController.getCoupon);

router.patch(
  "/:id",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  validate(updateCouponSchema),
  CouponController.updateCoupon,
);

router.delete(
  "/:id",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  CouponController.deleteCoupon,
);

export default router;

