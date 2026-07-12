import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as SalesController from "./sales.controller";
import {
  checkoutSaleSchema,
  returnProductSchema,
  scanProductSchema,
} from "./sales.validation";

const router = Router();

router.post("/scan", validate(scanProductSchema), SalesController.scanProduct);
router.post("/checkout", validate(checkoutSaleSchema), SalesController.checkoutSale);
router.post("/return", validate(returnProductSchema), SalesController.returnProduct);
router.get("/history", SalesController.getSalesHistory);

export default router;
