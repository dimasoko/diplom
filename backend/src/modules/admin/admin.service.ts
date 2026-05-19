import { Prisma } from "../../generated/prisma/client";
import { OrderStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../errors/http-error";
import { prisma } from "../../lib/prisma";
import {
  AdminEventInput,
  MetricsQueryInput,
  UsersQueryInput,
} from "./admin.validation";

type TopDrinkRow = {
  menu_item_id: string;
  name: string;
  total_quantity: bigint | number;
};

type HourlyLoadRow = {
  hour: number;
  orders_count: bigint | number;
};

const getDateRange = (query: MetricsQueryInput) => {
  if (!query.year) {
    return null;
  }
  const start = new Date(Date.UTC(query.year, (query.month ?? 1) - 1, query.day ?? 1, 0, 0, 0, 0));
  let end: Date;

  if (query.day) {
    end = new Date(Date.UTC(query.year, (query.month ?? 1) - 1, query.day + 1, 0, 0, 0, 0));
  } else if (query.month) {
    end = new Date(Date.UTC(query.year, query.month, 1, 0, 0, 0, 0));
  } else {
    end = new Date(Date.UTC(query.year + 1, 0, 1, 0, 0, 0, 0));
  }

  return { gte: start, lt: end };
};

export const getMetrics = async (query: MetricsQueryInput) => {
  const dateRange = getDateRange(query);
  const dateWhere = dateRange ? { created_at: dateRange } : {};

  const [issuedAgg, ordersByStatus, topDrinksRaw, hourlyLoadRaw] =
    await Promise.all([
      prisma.order.aggregate({
        where: {
          status: OrderStatus.ISSUED,
          ...dateWhere,
        },
        _sum: {
          total_price: true,
          bonus_used: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: dateWhere,
        _count: {
          _all: true,
        },
      }),
      prisma.$queryRaw<TopDrinkRow[]>(Prisma.sql`
        SELECT
          oi.menu_item_id,
          mi.name,
          SUM(oi.quantity)::bigint AS total_quantity
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.status = 'ISSUED'
          ${dateRange ? Prisma.sql`AND o.created_at >= ${dateRange.gte} AND o.created_at < ${dateRange.lt}` : Prisma.empty}
          AND mi.deleted_at IS NULL
        GROUP BY oi.menu_item_id, mi.name
        ORDER BY total_quantity DESC
        LIMIT 10
      `),
      prisma.$queryRaw<HourlyLoadRow[]>(Prisma.sql`
        SELECT
          EXTRACT(HOUR FROM created_at)::int AS hour,
          COUNT(*)::bigint AS orders_count
        FROM orders
        ${dateRange ? Prisma.sql`WHERE created_at >= ${dateRange.gte} AND created_at < ${dateRange.lt}` : Prisma.empty}
        GROUP BY hour
        ORDER BY hour ASC
      `),
    ]);

  const issuedTotal = issuedAgg._sum.total_price ?? 0;
  const issuedBonusUsed = issuedAgg._sum.bonus_used ?? 0;
  const issuedCount = issuedAgg._count._all ?? 0;

  const revenue = issuedTotal - issuedBonusUsed;
  const average_check = issuedCount > 0 ? Math.round(revenue / issuedCount) : 0;

  return {
    revenue,
    average_check,
    orders_by_status: ordersByStatus.map((item) => ({
      status: item.status,
      count: item._count._all,
    })),
    top_drinks: topDrinksRaw.map((row) => ({
      menu_item_id: row.menu_item_id,
      name: row.name,
      total_quantity: Number(row.total_quantity),
    })),
    hourly_load: hourlyLoadRaw.map((row) => ({
      hour: row.hour,
      orders_count: Number(row.orders_count),
    })),
  };
};

export const getUsers = async (query: UsersQueryInput) => {
  const page = query.page;
  const limit = query.limit;
  const search = query.search?.trim();
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    deleted_at: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        bonus_balance: true,
        created_at: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    }),
  ]);

  const userIds = users.map((user) => user.id);

  const ltvRows =
    userIds.length > 0
      ? await prisma.order.groupBy({
          by: ["user_id"],
          where: {
            status: OrderStatus.ISSUED,
            user_id: {
              in: userIds,
            },
          },
          _sum: {
            total_price: true,
          },
        })
      : [];

  const ltvMap = new Map(
    ltvRows.map((row) => [
      row.user_id,
      row._sum.total_price ?? 0,
    ]),
  );

  const data = users.map((user) => ({
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    bonus_balance: user.bonus_balance,
    created_at: user.created_at,
    orders_count: user._count.orders,
    ltv: ltvMap.get(user.id) ?? 0,
  }));

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAdminEvents = async () => {
  return prisma.event.findMany({
    orderBy: [{ event_date: "desc" }, { title: "asc" }],
  });
};

export const createAdminEvent = async (payload: AdminEventInput) => {
  return prisma.event.create({
    data: payload,
  });
};

export const updateAdminEvent = async (id: string, payload: AdminEventInput) => {
  const existing = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new HttpError(404, "Event not found");
  }
  return prisma.event.update({ where: { id }, data: payload });
};

export const deleteAdminEvent = async (id: string) => {
  const existing = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new HttpError(404, "Event not found");
  }
  await prisma.event.delete({ where: { id } });
};
