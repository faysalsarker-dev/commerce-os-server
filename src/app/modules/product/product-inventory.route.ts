import { Router } from "express";
import { memoryMulterUpload } from "../../config/multer.config";
import { validate } from "../../middleware/validate";
import * as ProductController from "./product.controller";
import { createVariantSchema, stockMovementSchema, updateColorSchema, updateVariantSchema } from "./product.validation";

const router = Router();

router.patch("/colors/:id", memoryMulterUpload.array("images"), validate(updateColorSchema), ProductController.updateColor);
router.delete("/colors/:id", ProductController.deleteColor);
router.post("/colors/:colorId/variants", validate(createVariantSchema), ProductController.createVariant);
router.patch("/variants/:id", validate(updateVariantSchema), ProductController.updateVariant);
router.delete("/variants/:id", ProductController.deleteVariant);
router.post("/variants/:id/stock-movements", validate(stockMovementSchema), ProductController.createStockMovement);

export default router;
