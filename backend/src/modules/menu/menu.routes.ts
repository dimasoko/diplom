import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import {
  createMenuItemHandler,
  getAddonsHandler,
  getMenuItemsHandler,
  updateMenuItemHandler,
} from "./menu.controller";

const menuRouter = Router();

menuRouter.get("/items", getMenuItemsHandler);
menuRouter.get("/addons", getAddonsHandler);
menuRouter.post(
  "/items",
  requireAuth,
  requireRole([UserRole.STAFF, UserRole.ADMIN]),
  createMenuItemHandler,
);
menuRouter.put(
  "/items/:id",
  requireAuth,
  requireRole([UserRole.STAFF, UserRole.ADMIN]),
  updateMenuItemHandler,
);

export default menuRouter;
