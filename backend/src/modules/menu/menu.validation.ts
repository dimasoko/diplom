import { z } from "zod";

export const menuItemPayloadSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  category: z.string().trim().min(1),
  price_s: z.number().int().min(0).nullable().optional(),
  price_m: z.number().int().min(0).nullable().optional(),
  price_l: z.number().int().min(0).nullable().optional(),
  photo_url: z.string().trim().url().optional().nullable(),
  is_seasonal: z.boolean().optional().default(false),
  is_popular: z.boolean().optional().default(false),
});

export const menuItemParamsSchema = z.object({
  id: z.string().uuid(),
});

export type MenuItemPayloadInput = z.infer<typeof menuItemPayloadSchema>;
