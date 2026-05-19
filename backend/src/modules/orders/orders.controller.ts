import { NextFunction, Request, Response } from "express";

import { HttpError } from "../../errors/http-error";
import {
  createOrder,
  getWorkingHours,
  getMyOrders,
  getQueue,
  updateOrderStatus,
} from "./orders.service";
import {
  createOrderSchema,
  myOrdersQuerySchema,
  queueQuerySchema,
  updateOrderStatusParamsSchema,
  updateOrderStatusSchema,
} from "./orders.validation";

export const createOrderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const payload = createOrderSchema.parse(req.body);
    const order = await createOrder({
      userId: req.user.id,
      payload,
    });

    res.status(201).json({
      success: true,
      data: order,
      message: "Order created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = updateOrderStatusParamsSchema.parse(req.params);
    const payload = updateOrderStatusSchema.parse(req.body);

    const order = await updateOrderStatus({
      orderId: params.id,
      payload,
    });

    res.status(200).json({
      success: true,
      data: order,
      message: "Order status updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrdersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const query = myOrdersQuerySchema.parse(req.query);
    const result = await getMyOrders({
      userId: req.user.id,
      query,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getQueueHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = queueQuerySchema.parse(req.query);
    const queue = await getQueue({ query });

    res.status(200).json({
      success: true,
      data: queue.map((order) => ({
        id: order.id,
        status: order.status,
        pickup_time: order.pickup_time,
        customer_name: order.user.name,
        customer_phone: order.user.phone,
        public_number: String(order.created_at.getTime() % 10000).padStart(4, "0"),
        items: order.order_items.map((item) => ({
          id: item.id,
          name: item.menu_item.name,
          size: item.size,
          quantity: item.quantity,
          addons: item.order_item_addons.map((addon) => addon.addon.name),
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkingHoursHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const hours = getWorkingHours();
    res.status(200).json({
      success: true,
      data: hours,
    });
  } catch (error) {
    next(error);
  }
};
