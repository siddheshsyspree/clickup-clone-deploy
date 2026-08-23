import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireWorkspaceRole } from "../../middleware/requireRole";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./whatsapp.controller";

export const whatsappRouter: Router = Router();
whatsappRouter.use(authenticate);

whatsappRouter.get(
  "/workspaces/:workspaceId/whatsapp/conversations",
  requireWorkspaceRole("GUEST"),
  asyncHandler(controller.listConversations),
);
