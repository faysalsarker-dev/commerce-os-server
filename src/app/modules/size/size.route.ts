import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as SizeController from "./size.controller";
import { createSizeSchema, updateSizeSchema } from "./size.validation";

const router = Router();

router.post("/", validate(createSizeSchema), SizeController.createSize);
router.get("/", SizeController.getSizes);
router.get("/:id", SizeController.getSize);
router.patch("/:id", validate(updateSizeSchema), SizeController.updateSize);
router.delete("/:id", SizeController.deleteSize);

export default router;
