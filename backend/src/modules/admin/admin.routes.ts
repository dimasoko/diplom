import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import {
  createAdminEventHandler,
  deleteAdminEventHandler,
  getAdminEventsHandler,
  getMetricsHandler,
  getUsersHandler,
  updateAdminEventHandler,
} from "./admin.controller";

const adminRouter = Router();

adminRouter.use(requireAuth, requireRole([UserRole.STAFF, UserRole.ADMIN]));

adminRouter.get("/metrics", getMetricsHandler);
adminRouter.get("/users", getUsersHandler);
adminRouter.get("/events", getAdminEventsHandler);
adminRouter.post("/events", createAdminEventHandler);
adminRouter.put("/events/:id", updateAdminEventHandler);
adminRouter.delete("/events/:id", deleteAdminEventHandler);

export default adminRouter;
