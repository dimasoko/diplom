import { z } from "zod";

export const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

export type UsersQueryInput = z.infer<typeof usersQuerySchema>;

export const metricsQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  day: z.coerce.number().int().min(1).max(31).optional(),
});

export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;

export const adminEventSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  event_date: z.coerce.date(),
  published_at: z.coerce.date().optional(),
  photo_url: z.string().trim().url().optional().nullable(),
  is_published: z.boolean().default(true),
});

export const adminEventParamsSchema = z.object({
  id: z.string().uuid(),
});

export type AdminEventInput = z.infer<typeof adminEventSchema>;
