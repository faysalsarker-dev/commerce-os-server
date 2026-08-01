import { Router } from "express";
import * as ProductController from "./product.controller";
import { validate } from "../../middleware/validate";
import {
  createProductSchema,
  updateProductSchema,
  createProductColorSchema,
  updateProductColorSchema,
  createProductVariantSchema,
  updateProductVariantSchema,
} from "./product.validation";

const router = Router();

// ==================== STEP 2: PRODUCT COLORS ====================
router.post(
  "/color",
  validate(createProductColorSchema),
  ProductController.addProductColor,
);
router.patch(
  "/color/:id",
  validate(updateProductColorSchema),
  ProductController.updateProductColor,
);
router.delete("/color/:id", ProductController.deleteProductColor);

// ==================== STEP 3: PRODUCT VARIANTS ====================
router.post(
  "/variant",
  validate(createProductVariantSchema),
  ProductController.addProductVariant,
);
router.patch(
  "/variant/:id",
  validate(updateProductVariantSchema),
  ProductController.updateProductVariant,
);
router.delete("/variant/:id", ProductController.deleteProductVariant);

// ==================== STEP 1: BASE PRODUCT CONTAINERS ====================
router.post(
  "/",
  validate(createProductSchema),
  ProductController.createProduct,
);
router.get("/", ProductController.getProducts);
router.get("/:id", ProductController.getProduct);
router.patch(
  "/:id",
  validate(updateProductSchema),
  ProductController.updateProduct,
);
router.delete("/:id", ProductController.deleteProduct);

export default router;
