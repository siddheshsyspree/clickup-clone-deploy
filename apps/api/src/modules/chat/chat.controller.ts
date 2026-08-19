import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/errors";
import * as chatService from "./chat.service";

export async function listChannels(req: Request, res: Response) {
  res.json(await chatService.listChannels(req.params.workspaceId, req.user!.id));
}
export async function createChannel(req: Request, res: Response) {
  res.status(201).json(await chatService.createChannel(req.params.workspaceId, req.user!.id, req.body));
}
export async function getOrCreateDm(req: Request, res: Response) {
  res.json(await chatService.getOrCreateDm(req.params.workspaceId, req.user!.id, req.params.userId));
}

export async function listMessages(req: Request, res: Response) {
  res.json(await chatService.listMessages(req.params.id, req.user!.id, req.query.cursor as string | undefined));
}
export async function createMessage(req: Request, res: Response) {
  res.status(201).json(await chatService.createMessage(req.params.id, req.user!.id, req.body));
}
export async function editMessage(req: Request, res: Response) {
  res.json(await chatService.editMessage(req.params.id, req.user!.id, req.body.content));
}
export async function deleteMessage(req: Request, res: Response) {
  await chatService.deleteMessage(req.params.id, req.user!.id);
  res.status(204).send();
}
export async function addReaction(req: Request, res: Response) {
  res.json(await chatService.addReaction(req.params.id, req.user!.id, req.body.emoji));
}
export async function removeReaction(req: Request, res: Response) {
  res.json(await chatService.removeReaction(req.params.id, req.user!.id, req.params.emoji));
}

export async function uploadAttachment(req: Request, res: Response) {
  if (!req.file) throw new BadRequestError("No file uploaded");
  res.status(201).json(await chatService.uploadAttachment(req.params.id, req.user!.id, req.file));
}
export async function downloadAttachment(req: Request, res: Response) {
  const file = await chatService.readAttachmentForUser(req.params.id, req.user!.id);
  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);
  res.send(file.buffer);
}
