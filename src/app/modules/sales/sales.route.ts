import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as SalesController from "./sales.controller";
import {
  checkoutSaleSchema,
  scanProductSchema,
} from "./sales.validation";
import { checkAuth } from "../../middleware/authenticate";

const router = Router();
router.use(checkAuth())
router.post("/scan", validate(scanProductSchema), SalesController.scanProduct);
router.post("/checkout", validate(checkoutSaleSchema), SalesController.checkoutSale);
router.get("/history", SalesController.getSalesHistory);
router.get("/invoice/:invoiceNo", SalesController.getSaleByInvoiceNumber);

export default router;
