import { PrismaClient } from '../generated/prisma/client.js'

const prisma = new PrismaClient() as any

type CreateOrderItemInput = {
  menuItemId: string
  quantity: number
  addonIds?: string[]
}

type CreateOrderInput = {
  userId: string
  pickupAt: Date
  comment?: string
  bonusUsed?: number
  items: CreateOrderItemInput[]
}

type RepeatOrderInput = {
  orderId: string
  userId: string
}

function orderSelect() {
  return {
    id: true,
    user_id: true,
    status: true,
    comment: true,
    pickup_at: true,
    total_price: true,
    bonus_used: true,
    created_at: true,
    updated_at: true,
    order_items: {
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        menu_item_id: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        menu_item: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
          },
        },
        order_item_addons: {
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
            addon_id: true,
            quantity: true,
            unit_price: true,
            total_price: true,
            addon: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
              },
            },
          },
        },
      },
    },
  }
}

async function getPricedItems(tx: any, items: CreateOrderItemInput[]) {
  const menuItemIds = [...new Set(items.map((item) => item.menuItemId))]
  const addonIds = [
    ...new Set(items.flatMap((item) => item.addonIds ?? [])),
  ]

  const [menuItems, addons] = await Promise.all([
    tx.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        deleted_at: null,
        is_available: true,
      },
    }),
    tx.addon.findMany({
      where: {
        id: { in: addonIds },
        deleted_at: null,
        is_available: true,
      },
    }),
  ])

  const menuItemMap = new Map(menuItems.map((item: any) => [item.id, item]))
  const addonMap = new Map(addons.map((addon: any) => [addon.id, addon]))

  return items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId)

    if (!menuItem) {
      throw new Error(`Menu item ${item.menuItemId} not found`)
    }

    const selectedAddons = (item.addonIds ?? []).map((addonId) => {
      const addon = addonMap.get(addonId)

      if (!addon) {
        throw new Error(`Addon ${addonId} not found`)
      }

      return addon
    })

    const unitPrice =
      Number(menuItem.price) +
      selectedAddons.reduce(
        (sum: number, addon: any) => sum + Number(addon.price),
        0,
      )

    return {
      menuItem,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      addons: selectedAddons,
    }
  })
}

function calculateBonusWriteOff(totalPrice: number, requestedBonusUsed = 0) {
  const maxBonusUsage = Math.floor(totalPrice * 0.5)

  if (requestedBonusUsed < 0) {
    throw new Error('bonus_used cannot be negative')
  }

  if (requestedBonusUsed > maxBonusUsage) {
    throw new Error('bonus_used exceeds 50% of order total')
  }

  return requestedBonusUsed
}

export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx: any) => {
    const user = await tx.user.findFirst({
      where: {
        id: input.userId,
        deleted_at: null,
        is_active: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const pricedItems = await getPricedItems(tx, input.items)
    const totalPrice = pricedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    )
    const bonusUsed = calculateBonusWriteOff(totalPrice, input.bonusUsed ?? 0)

    if (bonusUsed > user.bonus_balance) {
      throw new Error('Insufficient bonus balance')
    }

    const order = await tx.order.create({
      data: {
        user_id: input.userId,
        status: 'PENDING',
        pickup_at: input.pickupAt,
        comment: input.comment,
        total_price: totalPrice,
        bonus_used: bonusUsed,
      },
    })

    for (const pricedItem of pricedItems) {
      const orderItem = await tx.orderItem.create({
        data: {
          order_id: order.id,
          menu_item_id: pricedItem.menuItem.id,
          quantity: pricedItem.quantity,
          unit_price: pricedItem.unitPrice,
          total_price: pricedItem.totalPrice,
        },
      })

      for (const addon of pricedItem.addons) {
        await tx.orderItemAddon.create({
          data: {
            order_item_id: orderItem.id,
            addon_id: addon.id,
            quantity: pricedItem.quantity,
            unit_price: addon.price,
            total_price: Number(addon.price) * pricedItem.quantity,
          },
        })
      }
    }

    if (bonusUsed > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          bonus_balance: {
            decrement: bonusUsed,
          },
        },
      })

      await tx.bonusTransaction.create({
        data: {
          user_id: user.id,
          order_id: order.id,
          type: 'SPEND',
          amount: bonusUsed,
          description: 'Bonus write-off for order',
        },
      })
    }

    return tx.order.findUnique({
      where: { id: order.id },
      select: orderSelect(),
    })
  })
}

export async function updateOrderStatus(orderId: string, status: string) {
  return prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        deleted_at: null,
      },
      include: {
        user: true,
      },
    })

    if (!order) {
      return null
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status,
      },
    })

    if (status === 'ISSUED' && order.status !== 'ISSUED') {
      const baseAmount = Number(order.total_price) - Number(order.bonus_used ?? 0)
      const earnedBonus = Math.floor(baseAmount * 0.05)

      if (earnedBonus > 0) {
        await tx.user.update({
          where: { id: order.user_id },
          data: {
            bonus_balance: {
              increment: earnedBonus,
            },
          },
        })

        await tx.bonusTransaction.create({
          data: {
            user_id: order.user_id,
            order_id: order.id,
            type: 'EARN',
            amount: earnedBonus,
            description: 'Bonus accrual for issued order',
          },
        })
      }
    }

    return tx.order.findUnique({
      where: { id: updatedOrder.id },
      select: orderSelect(),
    })
  })
}

export async function repeatOrder(input: RepeatOrderInput) {
  return prisma.order.findFirst({
    where: {
      id: input.orderId,
      user_id: input.userId,
      deleted_at: null,
    },
    select: orderSelect(),
  })
}
