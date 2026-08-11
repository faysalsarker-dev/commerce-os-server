import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as RefundController from "./refund.controller";
import { createRefundSchema } from "./refund.validation";

const router = Router();

router.post("/", validate(createRefundSchema), RefundController.createRefund);
router.get("/", RefundController.getRefunds);
router.get("/sale/:saleId", RefundController.getRefundsBySale);
router.get("/:id", RefundController.getRefund);
router.delete("/:id", RefundController.deleteRefund);

export default router;
