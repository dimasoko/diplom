import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import {
  getPushHistoryHandler,
  getPushPublicKeyHandler,
  sendCampaignPushHandler,
  subscribePushHandler,
} from "./push.controller";

const pushRouter = Router();

pushRouter.get("/public-key", getPushPublicKeyHandler);
pushRouter.post("/subscribe", requireAuth, subscribePushHandler);
pushRouter.post(
  "/admin/send",
  requireAuth,
  requireRole([UserRole.STAFF, UserRole.ADMIN]),
  sendCampaignPushHandler,
);
pushRouter.get(
  "/admin/history",
  requireAuth,
  requireRole([UserRole.STAFF, UserRole.ADMIN]),
  getPushHistoryHandler,
);

export default pushRouter;
