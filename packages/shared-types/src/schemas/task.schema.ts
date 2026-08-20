import { z } from "zod";
import { TASK_PRIORITIES, DEPENDENCY_TYPES, COMMENT_CHANNELS } from "../enums";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.any().optional(),
  workflowStateId: z.string().min(1),
  priority: z.enum(TASK_PRIORITIES).default("NO_PRIORITY"),
  parentId: z.string().optional(),
  milestoneId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  estimateMinutes: z.number().int().positive().optional(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.any().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  milestoneId: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimateMinutes: z.number().int().positive().nullable().optional(),
  isArchived: z.boolean().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const moveTaskSchema = z.object({
  workflowStateId: z.string().min(1),
  position: z.number(),
});
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const createChecklistSchema = z.object({
  title: z.string().min(1).max(120),
});
export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;

export const createChecklistItemSchema = z.object({
  title: z.string().min(1).max(300),
  assigneeId: z.string().optional(),
});
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  isCompleted: z.boolean().optional(),
  position: z.number().optional(),
  assigneeId: z.string().nullable().optional(),
});
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

export const createDependencySchema = z.object({
  dependsOnId: z.string().min(1),
  type: z.enum(DEPENDENCY_TYPES).default("BLOCKS"),
});
export type CreateDependencyInput = z.infer<typeof createDependencySchema>;

export const commentEmailInputSchema = z.object({
  to: z.string().email(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
});
export type CommentEmailInput = z.infer<typeof commentEmailInputSchema>;

export const commentWhatsAppInputSchema = z.object({
  phone: z.string().min(6).max(20),
  body: z.string().min(1).max(4096),
});
export type CommentWhatsAppInput = z.infer<typeof commentWhatsAppInputSchema>;

export const createCommentSchema = z
  .object({
    content: z.any(),
    parentId: z.string().optional(),
    mentionedUserIds: z.array(z.string()).optional(),
    channel: z.enum(COMMENT_CHANNELS).default("COMMENT"),
    email: commentEmailInputSchema.optional(),
    whatsapp: commentWhatsAppInputSchema.optional(),
  })
  .refine((data) => data.channel !== "EMAIL" || !!data.email, {
    message: "Email details are required when channel is EMAIL",
    path: ["email"],
  })
  .refine((data) => data.channel !== "WHATSAPP" || !!data.whatsapp, {
    message: "A phone number and message are required when channel is WHATSAPP",
    path: ["whatsapp"],
  });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const createTimeEntrySchema = z.object({
  description: z.string().max(300).optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().optional(),
  isManual: z.boolean().default(false),
});
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

export const taskFilterSchema = z.object({
  workflowStateId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  labelId: z.string().optional(),
  q: z.string().optional(),
  includeArchived: z.coerce.boolean().default(false),
});
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
