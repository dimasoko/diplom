import { NextFunction, Request, Response } from "express";

import {
  createAdminEvent,
  deleteAdminEvent,
  getAdminEvents,
  getMetrics,
  getUsers,
  updateAdminEvent,
} from "./admin.service";
import {
  adminEventParamsSchema,
  adminEventSchema,
  metricsQuerySchema,
  usersQuerySchema,
} from "./admin.validation";

export const getMetricsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const metrics = await getMetrics(query);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = usersQuerySchema.parse(req.query);
    const result = await getUsers(query);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminEventsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const events = await getAdminEvents();
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

export const createAdminEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = adminEventSchema.parse(req.body);
    const event = await createAdminEvent(payload);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

export const updateAdminEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = adminEventParamsSchema.parse(req.params);
    const payload = adminEventSchema.parse(req.body);
    const event = await updateAdminEvent(params.id, payload);
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = adminEventParamsSchema.parse(req.params);
    await deleteAdminEvent(params.id);
    res.status(200).json({ success: true, data: { id: params.id } });
  } catch (error) {
    next(error);
  }
};
