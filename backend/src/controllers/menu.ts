import type { Request, Response } from 'express'
import { z } from 'zod'
import {
  createMenuItem,
  getMenuItemById,
  listMenuItems,
  softDeleteMenuItem,
  updateMenuItem,
} from '../services/menuService.js'

const menuParamsSchema = z.object({
  id: z.string().uuid(),
})

const menuQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
})

const menuBodySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(180),
  description: z.string().trim().optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().positive(),
  weightGrams: z.number().int().positive().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

function handleMenuError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.flatten(),
    })
  }

  return res.status(500).json({
    message: 'Internal server error',
  })
}

export async function listMenuItemsHandler(req: Request, res: Response) {
  try {
    const query = menuQuerySchema.parse(req.query)
    const items = await listMenuItems(query)

    return res.status(200).json(items)
  } catch (error) {
    return handleMenuError(res, error)
  }
}

export async function getMenuItemHandler(req: Request, res: Response) {
  try {
    const { id } = menuParamsSchema.parse(req.params)
    const item = await getMenuItemById(id)

    if (!item) {
      return res.status(404).json({
        message: 'Menu item not found',
      })
    }

    return res.status(200).json(item)
  } catch (error) {
    return handleMenuError(res, error)
  }
}

export async function createMenuItemHandler(req: Request, res: Response) {
  try {
    const payload = menuBodySchema.parse(req.body)
    const item = await createMenuItem(payload)

    return res.status(201).json(item)
  } catch (error) {
    return handleMenuError(res, error)
  }
}

export async function updateMenuItemHandler(req: Request, res: Response) {
  try {
    const { id } = menuParamsSchema.parse(req.params)
    const payload = menuBodySchema.parse(req.body)
    const item = await updateMenuItem(id, payload)

    if (!item) {
      return res.status(404).json({
        message: 'Menu item not found',
      })
    }

    return res.status(200).json(item)
  } catch (error) {
    return handleMenuError(res, error)
  }
}

export async function deleteMenuItemHandler(req: Request, res: Response) {
  try {
    const { id } = menuParamsSchema.parse(req.params)
    const item = await softDeleteMenuItem(id)

    if (!item) {
      return res.status(404).json({
        message: 'Menu item not found',
      })
    }

    return res.status(200).json({
      message: 'Menu item deleted',
    })
  } catch (error) {
    return handleMenuError(res, error)
  }
}
