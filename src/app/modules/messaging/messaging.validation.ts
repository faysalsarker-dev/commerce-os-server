import { z } from "zod";

export const messagingPlatformSchema = z.enum([
  "MESSENGER",
  "INSTAGRAM",
  "WHATSAPP",
  "TIKTOK",
]);

export const connectMessagingPlatformSchema = z.object({
  platform: messagingPlatformSchema,
});

export const sendMessageSchema = z
  .object({
    text: z.string().trim().min(1).max(10_000),
  })
  .strict();

export const listMessagesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
