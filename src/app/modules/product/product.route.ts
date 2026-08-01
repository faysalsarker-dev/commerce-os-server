import { Router } from "express";
import { validate } from "../../middleware/validate";
import { memoryMulterUpload, multerUpload } from "../../config/multer.config";
import * as ProductController from "./product.controller";
import { createColorSchema, createProductSchema, updateProductSchema } from "./product.validation";

const router = Router();

router.get("/", ProductController.getProducts);
router.post("/", validate(createProductSchema), ProductController.createProduct);
router.get("/:id", ProductController.getProduct);
router.patch("/:id", validate(updateProductSchema), ProductController.updateProduct);
router.delete("/:id", ProductController.deleteProduct);
router.post("/:productId/colors", multerUpload.array("images"), ProductController.createColor);

export default router;
