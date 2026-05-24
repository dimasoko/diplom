import { prisma } from "../../lib/prisma";

const getRandomPopularItem = async () => {
  const popularCount = await prisma.menuItem.count({
    where: {
      deleted_at: null,
      is_popular: true,
    },
  });

  if (popularCount === 0) {
    return null;
  }

  const skip = Math.floor(Math.random() * popularCount);

  return prisma.menuItem.findFirst({
    where: {
      deleted_at: null,
      is_popular: true,
    },
    skip,
    take: 1,
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

const getNearestEvent = async () => {
  const now = new Date();
  const upcoming = await prisma.event.findFirst({
    where: {
      is_published: true,
      event_date: { gte: now },
    },
    orderBy: [{ event_date: "asc" }, { published_at: "desc" }],
  });

  if (upcoming) {
    return upcoming;
  }

  return prisma.event.findFirst({
    where: {
      is_published: true,
    },
    orderBy: [{ event_date: "desc" }, { published_at: "desc" }],
  });
};

export const getHomeBento = async () => {
  const [popular_item, nearest_event] = await Promise.all([
    getRandomPopularItem(),
    getNearestEvent(),
  ]);

  return {
    popular_item,
    nearest_event,
  };
};

export const getEvents = async () => {
  return prisma.event.findMany({
    where: {
      is_published: true,
    },
    orderBy: [{ published_at: "desc" }, { event_date: "asc" }],
  });
};

export const getGallery = async () => {
  return prisma.gallery.findMany({
    where: {
      is_active: true,
      deleted_at: null,
    },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });
};

export const getBaristas = async () => {
  return prisma.barista.findMany({
    orderBy: { name: "asc" },
  });
};
