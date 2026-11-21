import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { checkAuth } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import * as CourierIntegrationController from "./courier-integration.controller";
import {
  createCourierAccountSchema,
  customerHistorySchema,
  dispatchShipmentSchema,
  testCourierConnectionSchema,
  updateCourierAccountSchema,
} from "./courier-integration.validation";

const router = Router();

router.use(checkAuth([Role.ADMIN, Role.SUPER_ADMIN]));

router.post(
  "/test",
  validate(testCourierConnectionSchema),
  CourierIntegrationController.testCourierConnection,
);
router.post(
  "/",
  validate(createCourierAccountSchema),
  CourierIntegrationController.createCourierAccount,
);
router.post(
  "/customer-history",
  checkAuth([Role.ADMIN, Role.SUPER_ADMIN]),
  validate(customerHistorySchema),
  CourierIntegrationController.getCourierCustomerHistory,
);
router.post(
  "/shipments",
  validate(dispatchShipmentSchema),
  CourierIntegrationController.dispatchCourierShipment,
);
router.get(
  "/shipments/:shipmentId",
  CourierIntegrationController.getCourierShipment,
);
router.get(
  "/:id/webhook-logs",
  CourierIntegrationController.getCourierWebhookLogs,
);
router.get("/", CourierIntegrationController.getCourierAccounts);
router.get("/:id", CourierIntegrationController.getCourierAccount);
router.patch(
  "/:id",
  validate(updateCourierAccountSchema),
  CourierIntegrationController.updateCourierAccount,
);
router.post(
  "/:id/regenerate-webhook-secret",
  CourierIntegrationController.regenerateWebhookSecret,
);
router.delete("/:id", CourierIntegrationController.deleteCourierAccount);

export default router;
