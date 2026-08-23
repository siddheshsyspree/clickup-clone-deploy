import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import { NotFoundError, BadRequestError } from "../../lib/errors";
import { emitToWorkspace } from "../../sockets";
import { whatsappProvider } from "../../lib/whatsapp";
import { env } from "../../config/env";

const MESSAGE_INCLUDE = {
  author: { select: { id: true, name: true, avatarUrl: true } },
} as const;

/**
 * Digits only, no leading "+" — Meta's webhook always sends the "from" number
 * this way (e.g. "919876543210"), so a phone typed into the app WITH a "+"
 * would never match an inbound message unless both sides normalize the same
 * way. Applied on every write and every lookup.
 */
function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/** One row per client that has an active thread — the Team Inbox list. Every
 * team member with workspace access sees every conversation here, which is
 * what actually gives this the "shared, everyone's in it" feel a real
 * WhatsApp group would — the API has no concept of multi-party groups. */
export async function listConversations(workspaceId: string) {
  const tasks = await prisma.task.findMany({
    where: { whatsappPhone: { not: null }, project: { workspaceId } },
    select: {
      id: true,
      title: true,
      project: { select: { name: true, key: true } },
      whatsappMessages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return tasks
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      projectName: t.project.name,
      projectKey: t.project.key,
      lastMessage: t.whatsappMessages[0] ?? null,
    }))
    .sort((a, b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bt - at;
    });
}

export async function getThread(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { whatsappPhone: true } });
  if (!task) throw new NotFoundError("Task not found");

  const messages = await prisma.whatsAppMessage.findMany({
    where: { taskId },
    include: MESSAGE_INCLUDE,
    orderBy: { createdAt: "asc" },
  });

  return { phone: task.whatsappPhone, messages };
}

export async function sendMessage(taskId: string, authorId: string, input: { phone?: string; body: string }) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
  if (!task) throw new NotFoundError("Task not found");

  const phone = normalizePhone(input.phone ?? task.whatsappPhone ?? "");
  if (!phone) throw new BadRequestError("Add a phone number to start this conversation");

  let status: "SENT" | "FAILED" = "SENT";
  try {
    await whatsappProvider.send(phone, input.body);
  } catch (err) {
    status = "FAILED";
    // Still record the attempt — the sender needs to see it failed, not have
    // it silently vanish. Re-thrown after the row exists so the client sees
    // an error toast; the failed row stays visible in the thread either way.
    const message = await prisma.whatsAppMessage.create({
      data: { taskId, direction: "OUTBOUND", phone, body: input.body, status, authorId },
      include: MESSAGE_INCLUDE,
    });
    emitToWorkspace(task.project.workspaceId, "whatsapp:message", message);
    throw err instanceof Error ? err : new Error("WhatsApp send failed");
  }

  if (!task.whatsappPhone) {
    await prisma.task.update({ where: { id: taskId }, data: { whatsappPhone: phone } });
  }

  const message = await prisma.whatsAppMessage.create({
    data: { taskId, direction: "OUTBOUND", phone, body: input.body, status, authorId },
    include: MESSAGE_INCLUDE,
  });

  emitToWorkspace(task.project.workspaceId, "whatsapp:message", message);
  return message;
}

/** Meta signs the raw webhook body with the app secret; skips verification (warns once) if it isn't configured. */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!env.whatsappAppSecret) return true;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", env.whatsappAppSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
}

interface InboundMessage {
  from: string;
  body: string;
  providerMessageId: string;
}

interface StatusUpdate {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
}

/** Parses Meta's webhook payload shape into the two event types this app cares about. */
export function parseWebhookPayload(payload: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];

  const entries = (payload as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes ?? [];
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value ?? {};
      for (const m of (value.messages as Record<string, unknown>[] | undefined) ?? []) {
        const text = (m.text as { body?: string } | undefined)?.body;
        if (typeof m.from === "string" && typeof text === "string" && typeof m.id === "string") {
          messages.push({ from: m.from, body: text, providerMessageId: m.id });
        }
      }
      for (const s of (value.statuses as Record<string, unknown>[] | undefined) ?? []) {
        if (typeof s.id === "string" && typeof s.status === "string") {
          statuses.push({ providerMessageId: s.id, status: s.status as StatusUpdate["status"] });
        }
      }
    }
  }

  return { messages, statuses };
}

export async function receiveInbound(input: InboundMessage) {
  const phone = normalizePhone(input.from);
  const task = await prisma.task.findFirst({
    where: { whatsappPhone: phone },
    include: { project: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!task) {
    // No client task is bound to this number yet — nothing to attach it to.
    // Not an error: this is expected for anyone who messages the business
    // number before the team has opened a WhatsApp thread with them.
    console.warn(`[whatsapp] inbound message from unrecognized number ${phone}, dropped`);
    return null;
  }

  const message = await prisma.whatsAppMessage.create({
    data: {
      taskId: task.id,
      direction: "INBOUND",
      phone,
      body: input.body,
      status: "DELIVERED",
      providerMessageId: input.providerMessageId,
    },
    include: MESSAGE_INCLUDE,
  });

  emitToWorkspace(task.project.workspaceId, "whatsapp:message", message);
  return message;
}

export async function applyStatusUpdate(update: StatusUpdate) {
  const statusMap: Record<StatusUpdate["status"], "SENT" | "DELIVERED" | "READ" | "FAILED"> = {
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    failed: "FAILED",
  };
  await prisma.whatsAppMessage.updateMany({
    where: { providerMessageId: update.providerMessageId },
    data: { status: statusMap[update.status] },
  });
}
