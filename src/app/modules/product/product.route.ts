import { Router } from "express";
import * as ProductController from "./product.controller";
import { validate } from "../../middleware/validate";
import {
  createProductSchema,
  updateProductSchema,
} from "./product.validation";

const router = Router();

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
