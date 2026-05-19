import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import {
  createOrderHandler,
  getQueueHandler,
  getMyOrdersHandler,
  getWorkingHoursHandler,
  updateOrderStatusHandler,
} from "./orders.controller";

const ordersRouter = Router();

ordersRouter.post("/", requireAuth, createOrderHandler);
ordersRouter.get("/working-hours", getWorkingHoursHandler);
ordersRouter.get("/my", requireAuth, getMyOrdersHandler);
ordersRouter.get(
  "/queue",
  requireAuth,
  requireRole([UserRole.STAFF, UserRole.ADMIN]),
  getQueueHandler,
);
ordersRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole([UserRole.STAFF, UserRole.ADMIN]),
  updateOrderStatusHandler,
);

export default ordersRouter;
