import { Prisma } from "../../generated/prisma/client";
import { BonusTransactionType, OrderStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../errors/http-error";
import { prisma } from "../../lib/prisma";
import { sendOrderStatusPush } from "../push/push.service";
import {
  CreateOrderInput,
  MyOrdersQueryInput,
  QueueQueryInput,
  UpdateOrderStatusInput,
} from "./orders.validation";

const getWorkingHoursUtc = (): { openHour: number; closeHour: number } => {
  const openRaw = process.env.WORK_START_HOUR_UTC ?? "0";
  const closeRaw = process.env.WORK_END_HOUR_UTC ?? "24";

  const openHour = Number(openRaw);
  const closeHour = Number(closeRaw);

  if (
    !Number.isInteger(openHour) ||
    !Number.isInteger(closeHour) ||
    openHour < 0 ||
    openHour > 23 ||
    closeHour < 1 ||
    closeHour > 24
  ) {
    throw new HttpError(500, "Invalid working hours configuration");
  }

  return { openHour, closeHour };
};

export const getWorkingHours = () => {
  const { openHour, closeHour } = getWorkingHoursUtc();
  return {
    timezone: "UTC",
    open_hour_utc: openHour,
    close_hour_utc: closeHour,
  };
};

const isWithinWorkingHours = (pickupTime: Date): boolean => {
  const { openHour, closeHour } = getWorkingHoursUtc();
  const hour = pickupTime.getUTCHours();

  if (openHour === closeHour) {
    return true;
  }

  if (openHour < closeHour) {
    return hour >= openHour && hour < closeHour;
  }

  return hour >= openHour || hour < closeHour;
};

type CreateOrderParams = {
  userId: string;
  payload: CreateOrderInput;
};

export const createOrder = async ({ userId, payload }: CreateOrderParams) => {
  if (!isWithinWorkingHours(payload.pickup_time)) {
    throw new HttpError(400, "pickup_time is outside working hours");
  }

  const uniqueMenuItemIds = [...new Set(payload.items.map((item) => item.menu_item_id))];
  const uniqueAddonIds = [
    ...new Set(payload.items.flatMap((item) => item.addon_ids ?? [])),
  ];

  const [menuItems, addons] = await Promise.all([
    prisma.menuItem.findMany({
      where: {
        id: { in: uniqueMenuItemIds },
        deleted_at: null,
      },
      select: {
        id: true,
        price_s: true,
        price_m: true,
        price_l: true,
      },
    }),
    uniqueAddonIds.length
      ? prisma.addon.findMany({
          where: {
            id: { in: uniqueAddonIds },
            deleted_at: null,
          },
          select: {
            id: true,
            price: true,
          },
        })
      : Promise.resolve([]),
  ]);

  if (menuItems.length !== uniqueMenuItemIds.length) {
    throw new HttpError(400, "Some menu items are unavailable");
  }

  if (addons.length !== uniqueAddonIds.length) {
    throw new HttpError(400, "Some addons are unavailable");
  }

  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));
  const addonMap = new Map(addons.map((addon) => [addon.id, addon]));

  let total_price = 0;

  const preparedItems = payload.items.map((item) => {
    const menuItem = menuItemMap.get(item.menu_item_id);

    if (!menuItem) {
      throw new HttpError(400, "Menu item is unavailable");
    }

    const basePriceBySize =
      item.size === "S"
        ? menuItem.price_s
        : item.size === "M"
          ? menuItem.price_m
          : menuItem.price_l;

    if (basePriceBySize === null || basePriceBySize === undefined) {
      throw new HttpError(400, `Selected size is unavailable for item ${item.menu_item_id}`);
    }

    const resolvedAddons = (item.addon_ids ?? []).map((addonId) => {
      const addon = addonMap.get(addonId);

      if (!addon) {
        throw new HttpError(400, "Addon is unavailable");
      }

      return {
        addon_id: addon.id,
        calculated_addon_price: addon.price,
      };
    });

    const addonSum = resolvedAddons.reduce(
      (acc, addon) => acc + addon.calculated_addon_price,
      0,
    );
    const lineTotal = (basePriceBySize + addonSum) * item.quantity;

    total_price += lineTotal;

    return {
      menu_item_id: item.menu_item_id,
      size: item.size,
      quantity: item.quantity,
      calculated_item_price: basePriceBySize,
      order_item_addons: resolvedAddons,
    };
  });

  const bonus_used = payload.bonus_used ?? 0;

  if (bonus_used > total_price) {
    throw new HttpError(400, "bonus_used cannot exceed total_price");
  }

  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: userId,
          deleted_at: null,
        },
        select: {
          id: true,
          bonus_balance: true,
        },
      });

      if (!user) {
        throw new HttpError(404, "User not found");
      }

      if (bonus_used > user.bonus_balance) {
        throw new HttpError(400, "Not enough bonus balance");
      }

      if (bonus_used > 0) {
        const updatedUser = await tx.user.updateMany({
          where: {
            id: user.id,
            deleted_at: null,
            bonus_balance: {
              gte: bonus_used,
            },
          },
          data: {
            bonus_balance: {
              decrement: bonus_used,
            },
          },
        });

        if (updatedUser.count === 0) {
          throw new HttpError(409, "Failed to reserve bonuses. Retry request.");
        }
      }

      return tx.order.create({
        data: {
          user_id: user.id,
          status: OrderStatus.PENDING,
          total_price,
          bonus_used,
          bonus_earned: 0,
          pickup_time: payload.pickup_time,
          order_items: {
            create: preparedItems.map((item) => ({
              menu_item_id: item.menu_item_id,
              size: item.size,
              quantity: item.quantity,
              calculated_item_price: item.calculated_item_price,
              order_item_addons: {
                create: item.order_item_addons.map((addon) => ({
                  addon_id: addon.addon_id,
                  calculated_addon_price: addon.calculated_addon_price,
                })),
              },
            })),
          },
        },
        include: {
          order_items: {
            include: {
              order_item_addons: true,
            },
          },
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
};

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["BREWING", "CANCELLED"],
  BREWING: ["READY", "CANCELLED"],
  READY: ["ISSUED", "CANCELLED"],
  ISSUED: [],
  CANCELLED: [],
};

const ensureValidTransition = (
  oldStatus: OrderStatus,
  newStatus: OrderStatus,
): void => {
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[oldStatus];

  if (!allowedNext.includes(newStatus)) {
    throw new HttpError(
      400,
      `Invalid status transition: ${oldStatus} -> ${newStatus}`,
    );
  }
};

const getCashbackAmount = (totalPrice: number, bonusUsed: number): number => {
  const base = Math.max(totalPrice - bonusUsed, 0);
  return Math.floor(base * 0.05);
};

const getOrderById = async (orderId: string) => {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      order_items: {
        include: {
          order_item_addons: true,
        },
      },
    },
  });
};

const orderStatusRu: Record<OrderStatus, string> = {
  PENDING: "Новый",
  ACCEPTED: "Принят",
  BREWING: "Готовится",
  READY: "Готов",
  ISSUED: "Выдан",
  CANCELLED: "Отменен",
};

type UpdateOrderStatusParams = {
  orderId: string;
  payload: UpdateOrderStatusInput;
};

export const updateOrderStatus = async ({
  orderId,
  payload,
}: UpdateOrderStatusParams) => {
  const { old_status, new_status } = payload;

  ensureValidTransition(old_status, new_status);

  if (new_status === OrderStatus.ISSUED) {
    await prisma.$transaction(
      async (tx) => {
        const currentOrder = await tx.order.findFirst({
          where: {
            id: orderId,
            status: old_status,
          },
          select: {
            id: true,
            user_id: true,
            total_price: true,
            bonus_used: true,
          },
        });

        if (!currentOrder) {
          throw new HttpError(404, "Order not found");
        }

        const cashback = getCashbackAmount(
          currentOrder.total_price,
          currentOrder.bonus_used,
        );

        const updated = await tx.order.updateMany({
          where: {
            id: orderId,
            status: old_status,
          },
          data: {
            status: new_status,
            bonus_earned: cashback,
          },
        });

        if (updated.count === 0) {
          throw new HttpError(404, "Order not found");
        }

        await tx.user.update({
          where: { id: currentOrder.user_id },
          data: {
            bonus_balance: {
              increment: cashback,
            },
          },
        });

        await tx.bonusTransaction.create({
          data: {
            user_id: currentOrder.user_id,
            order_id: currentOrder.id,
            type: BonusTransactionType.EARN,
            amount: cashback,
            reason: "Кэшбек 5%",
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const order = await getOrderById(orderId);

    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    const publicNumber = String(order.created_at.getTime() % 10000).padStart(4, "0");
    await sendOrderStatusPush({
      userId: order.user_id,
      orderId: order.id,
      publicNumber,
      statusRu: orderStatusRu[new_status],
    });

    return order;
  }

  if (new_status === OrderStatus.CANCELLED) {
    await prisma.$transaction(
      async (tx) => {
        const currentOrder = await tx.order.findFirst({
          where: {
            id: orderId,
            status: old_status,
          },
          select: {
            id: true,
            user_id: true,
            bonus_used: true,
          },
        });

        if (!currentOrder) {
          throw new HttpError(404, "Order not found");
        }

        const updated = await tx.order.updateMany({
          where: {
            id: orderId,
            status: old_status,
          },
          data: {
            status: new_status,
          },
        });

        if (updated.count === 0) {
          throw new HttpError(404, "Order not found");
        }

        if (currentOrder.bonus_used > 0) {
          await tx.user.update({
            where: { id: currentOrder.user_id },
            data: {
              bonus_balance: {
                increment: currentOrder.bonus_used,
              },
            },
          });

          await tx.bonusTransaction.create({
            data: {
              user_id: currentOrder.user_id,
              order_id: currentOrder.id,
              type: BonusTransactionType.REFUND,
              amount: currentOrder.bonus_used,
              reason: "Отмена заказа",
            },
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const order = await getOrderById(orderId);

    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    const publicNumber = String(order.created_at.getTime() % 10000).padStart(4, "0");
    await sendOrderStatusPush({
      userId: order.user_id,
      orderId: order.id,
      publicNumber,
      statusRu: orderStatusRu[new_status],
    });

    return order;
  }

  const updated = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: old_status,
    },
    data: {
      status: new_status,
    },
  });

  if (updated.count === 0) {
    throw new HttpError(404, "Order not found");
  }

  const order = await getOrderById(orderId);

  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  const publicNumber = String(order.created_at.getTime() % 10000).padStart(4, "0");
  await sendOrderStatusPush({
    userId: order.user_id,
    orderId: order.id,
    publicNumber,
    statusRu: orderStatusRu[new_status],
  });

  return order;
};

type GetMyOrdersParams = {
  userId: string;
  query: MyOrdersQueryInput;
};

export const getMyOrders = async ({ userId, query }: GetMyOrdersParams) => {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    user_id: userId,
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        status: true,
        total_price: true,
        bonus_used: true,
        bonus_earned: true,
        created_at: true,
        pickup_time: true,
        order_items: {
          select: {
            id: true,
            size: true,
            quantity: true,
            calculated_item_price: true,
            menu_item: {
              select: {
                name: true,
              },
            },
            order_item_addons: {
              select: {
                calculated_addon_price: true,
                addon: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    data: {
      items: orders.map((order) => ({
        ...order,
        public_number: String(order.created_at.getTime() % 10000).padStart(4, "0"),
      })),
    },
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

type GetQueueParams = {
  query: QueueQueryInput;
};

export const getQueue = async ({ query }: GetQueueParams) => {
  const statuses = query.statuses ?? [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.BREWING,
    OrderStatus.READY,
  ];

  return prisma.order.findMany({
    where: {
      status: {
        in: statuses,
      },
    },
    orderBy: [{ status: "asc" }, { pickup_time: "asc" }, { created_at: "asc" }],
    include: {
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
      order_items: {
        include: {
          menu_item: {
            select: {
              name: true,
            },
          },
          order_item_addons: {
            include: {
              addon: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
};
