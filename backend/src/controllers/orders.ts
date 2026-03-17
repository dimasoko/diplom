import type { Response } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../middleware/requireAuth.js'
import {
  createOrder,
  repeatOrder,
  updateOrderStatus,
} from '../services/ordersService.js'

const createOrderBodySchema = z.object({
  pickupAt: z.coerce.date(),
  comment: z.string().trim().optional(),
  bonusUsed: z.number().int().min(0).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        addonIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .min(1),
})

const orderParamsSchema = z.object({
  id: z.string().uuid(),
})

const statusBodySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ISSUED', 'CANCELLED']),
})

function handleOrderError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.flatten(),
    })
  }

  if (error instanceof Error) {
    const status =
      error.message === 'User not found'
        ? 404
        : error.message.includes('not found')
          ? 404
          : error.message === 'Insufficient bonus balance' ||
              error.message === 'bonus_used exceeds 50% of order total' ||
              error.message === 'bonus_used cannot be negative'
            ? 400
            : 500

    return res.status(status).json({
      message: error.message,
    })
  }

  return res.status(500).json({
    message: 'Internal server error',
  })
}

export async function createOrderHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized',
      })
    }

    const payload = createOrderBodySchema.parse(req.body)
    const order = await createOrder({
      userId: req.user.userId,
      pickupAt: payload.pickupAt,
      comment: payload.comment,
      bonusUsed: payload.bonusUsed,
      items: payload.items,
    })

    return res.status(201).json(order)
  } catch (error) {
    return handleOrderError(res, error)
  }
}

export async function updateOrderStatusHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = orderParamsSchema.parse(req.params)
    const { status } = statusBodySchema.parse(req.body)
    const order = await updateOrderStatus(id, status)

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
      })
    }

    return res.status(200).json(order)
  } catch (error) {
    return handleOrderError(res, error)
  }
}

export async function repeatOrderHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized',
      })
    }

    const { id } = orderParamsSchema.parse(req.params)
    const order = await repeatOrder({
      orderId: id,
      userId: req.user.userId,
    })

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
      })
    }

    return res.status(200).json(order)
  } catch (error) {
    return handleOrderError(res, error)
  }
}
