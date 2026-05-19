import { z } from "zod";

export const subscribePushSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const pushCampaignSchema = z.object({
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(4).max(240),
  url: z.string().trim().optional(),
});

export const pushHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type SubscribePushInput = z.infer<typeof subscribePushSchema>;
export type PushCampaignInput = z.infer<typeof pushCampaignSchema>;
export type PushHistoryQueryInput = z.infer<typeof pushHistoryQuerySchema>;
