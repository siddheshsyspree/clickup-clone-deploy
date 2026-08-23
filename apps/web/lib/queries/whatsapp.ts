import { api } from "@/lib/api-client";

export interface WhatsAppMessage {
  id: string;
  taskId: string;
  direction: "INBOUND" | "OUTBOUND";
  phone: string;
  body: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  providerMessageId: string | null;
  authorId: string | null;
  author: { id: string; name: string; avatarUrl: string | null } | null;
  createdAt: string;
}

export interface WhatsAppThread {
  phone: string | null;
  messages: WhatsAppMessage[];
}

export interface WhatsAppConversation {
  taskId: string;
  title: string;
  projectName: string;
  projectKey: string;
  lastMessage: WhatsAppMessage | null;
}

export const getWhatsAppThread = (taskId: string) => api.get<WhatsAppThread>(`/api/tasks/${taskId}/whatsapp`);

export const sendWhatsAppMessage = (taskId: string, input: { phone?: string; body: string }) =>
  api.post<WhatsAppMessage>(`/api/tasks/${taskId}/whatsapp`, input);

export const listWhatsAppConversations = (workspaceId: string) =>
  api.get<WhatsAppConversation[]>(`/api/workspaces/${workspaceId}/whatsapp/conversations`);
