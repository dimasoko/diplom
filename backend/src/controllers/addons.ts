import type { Request, Response } from 'express'
import { z } from 'zod'
import {
  createAddon,
  getAddonById,
  listAddons,
  softDeleteAddon,
  updateAddon,
} from '../services/addonsService.js'

const addonParamsSchema = z.object({
  id: z.string().uuid(),
})

const addonBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().optional(),
  price: z.number().positive(),
  type: z.enum(['MILK', 'SYRUP', 'EXTRA']),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

function handleAddonError(res: Response, error: unknown) {
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

export async function listAddonsHandler(_req: Request, res: Response) {
  try {
    const addons = await listAddons()
    return res.status(200).json(addons)
  } catch (error) {
    return handleAddonError(res, error)
  }
}

export async function getAddonHandler(req: Request, res: Response) {
  try {
    const { id } = addonParamsSchema.parse(req.params)
    const addon = await getAddonById(id)

    if (!addon) {
      return res.status(404).json({
        message: 'Addon not found',
      })
    }

    return res.status(200).json(addon)
  } catch (error) {
    return handleAddonError(res, error)
  }
}

export async function createAddonHandler(req: Request, res: Response) {
  try {
    const payload = addonBodySchema.parse(req.body)
    const addon = await createAddon(payload)

    return res.status(201).json(addon)
  } catch (error) {
    return handleAddonError(res, error)
  }
}

export async function updateAddonHandler(req: Request, res: Response) {
  try {
    const { id } = addonParamsSchema.parse(req.params)
    const payload = addonBodySchema.parse(req.body)
    const addon = await updateAddon(id, payload)

    if (!addon) {
      return res.status(404).json({
        message: 'Addon not found',
      })
    }

    return res.status(200).json(addon)
  } catch (error) {
    return handleAddonError(res, error)
  }
}

export async function deleteAddonHandler(req: Request, res: Response) {
  try {
    const { id } = addonParamsSchema.parse(req.params)
    const addon = await softDeleteAddon(id)

    if (!addon) {
      return res.status(404).json({
        message: 'Addon not found',
      })
    }

    return res.status(200).json({
      message: 'Addon deleted',
    })
  } catch (error) {
    return handleAddonError(res, error)
  }
}
