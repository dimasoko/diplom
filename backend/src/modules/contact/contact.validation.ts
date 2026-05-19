import { z } from "zod";

export const createContactRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(32),
  message: z.string().trim().min(3).max(2000),
});

export type CreateContactRequestInput = z.infer<
  typeof createContactRequestSchema
>;
