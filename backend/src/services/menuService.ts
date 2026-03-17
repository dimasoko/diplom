import { PrismaClient } from '../generated/prisma/client.js'

const prisma = new PrismaClient() as any

type ListMenuItemsInput = {
  category?: string
}

type MenuItemInput = {
  categoryId: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  price: number
  weightGrams?: number
  isAvailable?: boolean
  isFeatured?: boolean
}

function menuItemSelect() {
  return {
    id: true,
    category_id: true,
    name: true,
    slug: true,
    description: true,
    image_url: true,
    price: true,
    weight_grams: true,
    is_available: true,
    is_featured: true,
    created_at: true,
    updated_at: true,
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
  }
}

export async function listMenuItems(input: ListMenuItemsInput) {
  return prisma.menuItem.findMany({
    where: {
      deleted_at: null,
      ...(input.category
        ? {
            category: {
              slug: input.category,
              deleted_at: null,
            },
          }
        : {}),
    },
    select: menuItemSelect(),
    orderBy: [{ category: { sort_order: 'asc' } }, { name: 'asc' }],
  })
}

export async function getMenuItemById(id: string) {
  return prisma.menuItem.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    select: menuItemSelect(),
  })
}

export async function createMenuItem(input: MenuItemInput) {
  return prisma.menuItem.create({
    data: {
      category_id: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      image_url: input.imageUrl,
      price: input.price,
      weight_grams: input.weightGrams,
      is_available: input.isAvailable ?? true,
      is_featured: input.isFeatured ?? false,
    },
    select: menuItemSelect(),
  })
}

export async function updateMenuItem(id: string, input: MenuItemInput) {
  const existingItem = await prisma.menuItem.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  })

  if (!existingItem) {
    return null
  }

  return prisma.menuItem.update({
    where: { id },
    data: {
      category_id: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      image_url: input.imageUrl,
      price: input.price,
      weight_grams: input.weightGrams,
      is_available: input.isAvailable ?? true,
      is_featured: input.isFeatured ?? false,
    },
    select: menuItemSelect(),
  })
}

export async function softDeleteMenuItem(id: string) {
  const existingItem = await prisma.menuItem.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  })

  if (!existingItem) {
    return null
  }

  return prisma.menuItem.update({
    where: { id },
    data: {
      deleted_at: new Date(),
    },
    select: menuItemSelect(),
  })
}
