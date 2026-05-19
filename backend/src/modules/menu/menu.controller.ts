import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { createMenuItem, getAddons, getMenuItems, updateMenuItem } from "./menu.service";
import { menuItemParamsSchema, menuItemPayloadSchema } from "./menu.validation";

const menuItemsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
});

export const getMenuItemsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = menuItemsQuerySchema.parse(req.query);
    const items = await getMenuItems({
      category: query.category,
    });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

export const getAddonsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const addons = await getAddons();

    res.status(200).json({
      success: true,
      data: addons,
    });
  } catch (error) {
    next(error);
  }
};

export const createMenuItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = menuItemPayloadSchema.parse(req.body);
    const menuItem = await createMenuItem(payload);
    res.status(201).json({ success: true, data: menuItem });
  } catch (error) {
    next(error);
  }
};

export const updateMenuItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = menuItemParamsSchema.parse(req.params);
    const payload = menuItemPayloadSchema.parse(req.body);
    const menuItem = await updateMenuItem(params.id, payload);
    res.status(200).json({ success: true, data: menuItem });
  } catch (error) {
    next(error);
  }
};
