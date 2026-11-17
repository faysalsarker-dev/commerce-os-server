import { Router } from "express";
import { checkAuth } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import * as OrderController from "./order.controller";
import {
  createOrderSchema,
  updateOrderSchema,
} from "./order.validation";

const router = Router();

router.use(checkAuth());
router.post("/", validate(createOrderSchema), OrderController.createOrder);
router.get("/", OrderController.getOrders);
router.get("/:id", OrderController.getOrder);
router.patch("/:id", validate(updateOrderSchema), OrderController.updateOrder);
router.delete("/:id", OrderController.deleteOrder);

export default router;
