import { Router } from "express";
import { validate } from "../../middleware/validate";
import { courierWebhookSchema } from "./courier-integration.validation";
import * as CourierWebhookController from "./courier-webhook.controller";

const router = Router();

router.post(
  "/:provider/:accountId",
  validate(courierWebhookSchema),
  CourierWebhookController.receiveCourierWebhook,
);

export default router;
