import { z } from "zod";
import { CHANNEL_TYPES } from "../enums";

export const createChannelSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  type: z.enum(CHANNEL_TYPES).default("PUBLIC"),
  topic: z.string().max(200).optional(),
  memberIds: z.array(z.string()).optional(),
});
export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const messageAttachmentInputSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
});
export type MessageAttachmentInput = z.infer<typeof messageAttachmentInputSchema>;

export const createMessageSchema = z.object({
  content: z.string().max(4000).default(""),
  parentId: z.string().optional(),
  attachments: z.array(messageAttachmentInputSchema).max(10).optional(),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const addReactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});
export type AddReactionInput = z.infer<typeof addReactionSchema>;
