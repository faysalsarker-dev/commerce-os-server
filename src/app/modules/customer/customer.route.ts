import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as CustomerController from "./customer.controller";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "./customer.validation";

const router = Router();

router.post("/", validate(createCustomerSchema), CustomerController.createCustomer);
router.get("/", CustomerController.getCustomers);
router.get("/phone/:phone", CustomerController.getCustomerByPhone);
router.get("/:id", CustomerController.getCustomer);
router.patch("/:id", validate(updateCustomerSchema), CustomerController.updateCustomer);
router.delete("/:id", CustomerController.deleteCustomer);

export default router;
