import { PrismaClient } from '../generated/prisma/client.js'

const prisma = new PrismaClient() as any

type AddonInput = {
  name: string
  description?: string
  price: number
  type: string
  isAvailable?: boolean
  sortOrder?: number
}

function addonSelect() {
  return {
    id: true,
    name: true,
    description: true,
    price: true,
    type: true,
    is_available: true,
    sort_order: true,
    created_at: true,
    updated_at: true,
  }
}

export async function listAddons() {
  return prisma.addon.findMany({
    where: {
      deleted_at: null,
    },
    select: addonSelect(),
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  })
}

export async function getAddonById(id: string) {
  return prisma.addon.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    select: addonSelect(),
  })
}

export async function createAddon(input: AddonInput) {
  return prisma.addon.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      type: input.type,
      is_available: input.isAvailable ?? true,
      sort_order: input.sortOrder ?? 0,
    },
    select: addonSelect(),
  })
}

export async function updateAddon(id: string, input: AddonInput) {
  const existingAddon = await prisma.addon.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  })

  if (!existingAddon) {
    return null
  }

  return prisma.addon.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      type: input.type,
      is_available: input.isAvailable ?? true,
      sort_order: input.sortOrder ?? 0,
    },
    select: addonSelect(),
  })
}

export async function softDeleteAddon(id: string) {
  const existingAddon = await prisma.addon.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  })

  if (!existingAddon) {
    return null
  }

  return prisma.addon.update({
    where: { id },
    data: {
      deleted_at: new Date(),
    },
    select: addonSelect(),
  })
}
