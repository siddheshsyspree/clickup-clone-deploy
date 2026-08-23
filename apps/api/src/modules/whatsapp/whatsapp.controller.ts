import type { Request, Response } from "express";
import * as whatsappService from "./whatsapp.service";

export async function listConversations(req: Request, res: Response) {
  res.json(await whatsappService.listConversations(req.params.workspaceId));
}
