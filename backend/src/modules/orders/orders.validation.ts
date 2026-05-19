import { z } from "zod";

import { OrderItemSize, OrderStatus } from "../../generated/prisma/enums";

export const createOrderSchema = z.object({
  pickup_time: z.coerce.date(),
  bonus_used: z.number().int().min(0).default(0),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid(),
        size: z.enum(OrderItemSize),
        quantity: z.number().int().min(1),
        addon_ids: z.array(z.string().uuid()).default([]),
      }),
    )
    .min(1),
});

export const updateOrderStatusParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateOrderStatusSchema = z
  .object({
    old_status: z.enum(OrderStatus),
    new_status: z.enum(OrderStatus),
  })
  .refine((data) => data.old_status !== data.new_status, {
    message: "old_status and new_status must be different",
    path: ["new_status"],
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const myOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type MyOrdersQueryInput = z.infer<typeof myOrdersQuerySchema>;

export const queueQuerySchema = z.object({
  statuses: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      const raw = Array.isArray(value) ? value : value.split(",");
      const normalized = raw
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry): entry is OrderStatus =>
          Object.values(OrderStatus).includes(entry as OrderStatus),
        );
      return normalized.length > 0 ? normalized : undefined;
    }),
});

export type QueueQueryInput = z.infer<typeof queueQuerySchema>;
