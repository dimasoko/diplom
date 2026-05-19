import { prisma } from "../../lib/prisma";
import { HttpError } from "../../errors/http-error";
import { MenuItemPayloadInput } from "./menu.validation";

type GetMenuItemsParams = {
  category?: string;
};

export const getMenuItems = async (params: GetMenuItemsParams) => {
  return prisma.menuItem.findMany({
    where: {
      deleted_at: null,
      ...(params.category
        ? {
            category: {
              slug: params.category,
            },
          }
        : {}),
    },
    orderBy: {
      name: "asc",
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
};

export const getAddons = async () => {
  return prisma.addon.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: {
      name: "asc",
    },
  });
};

const resolveCategoryId = async (categoryValue: string) => {
  const slug = categoryValue.trim().toLowerCase();

  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ slug }, { name: categoryValue.trim() }],
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.category.create({
    data: {
      name: categoryValue.trim(),
      slug,
    },
    select: { id: true },
  });

  return created.id;
};

export const createMenuItem = async (payload: MenuItemPayloadInput) => {
  const categoryId = await resolveCategoryId(payload.category);

  return prisma.menuItem.create({
    data: {
      category_id: categoryId,
      name: payload.name,
      description: payload.description ?? null,
      price_s: payload.price_s ?? null,
      price_m: payload.price_m ?? null,
      price_l: payload.price_l ?? null,
      photo_url: payload.photo_url ?? null,
      is_seasonal: payload.is_seasonal,
      is_popular: payload.is_popular,
    },
  });
};

export const updateMenuItem = async (id: string, payload: MenuItemPayloadInput) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id, deleted_at: null },
    select: { id: true },
  });

  if (!existing) {
    throw new HttpError(404, "Menu item not found");
  }

  const categoryId = await resolveCategoryId(payload.category);

  return prisma.menuItem.update({
    where: { id },
    data: {
      category_id: categoryId,
      name: payload.name,
      description: payload.description ?? null,
      price_s: payload.price_s ?? null,
      price_m: payload.price_m ?? null,
      price_l: payload.price_l ?? null,
      photo_url: payload.photo_url ?? null,
      is_seasonal: payload.is_seasonal,
      is_popular: payload.is_popular,
    },
  });
};
