import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as RefundController from "./refund.controller";
import { createRefundSchema } from "./refund.validation";
import { createExchangeSchema } from "./refund.validation";
import { checkAuth } from "../../middleware/authenticate";

const router = Router();

router.use(checkAuth());
router.post("/", validate(createRefundSchema), RefundController.createRefund);
router.post("/exchange", validate(createExchangeSchema), RefundController.createExchange);
router.get("/", RefundController.getRefunds);
router.get("/sale/:saleId/exchanges", RefundController.getExchangesBySale);
router.get("/sale/:saleId", RefundController.getRefundsBySale);
router.get("/:id", RefundController.getRefund);

export default router;
