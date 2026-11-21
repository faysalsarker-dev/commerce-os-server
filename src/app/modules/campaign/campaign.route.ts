import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { checkAuth } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import * as CampaignController from "./campaign.controller";
import { createCampaignSchema, updateCampaignSchema } from "./campaign.validation";

const router = Router();

router.post(
  "/",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.MARKETER]),
  validate(createCampaignSchema),
  CampaignController.createCampaign,
);
router.get("/", checkAuth(), CampaignController.getCampaigns);
router.get("/:id", checkAuth(), CampaignController.getCampaign);
router.patch(
  "/:id",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.MARKETER]),
  validate(updateCampaignSchema),
  CampaignController.updateCampaign,
);
router.delete(
  "/:id",
  checkAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.MARKETER]),
  CampaignController.deleteCampaign,
);

export default router;
