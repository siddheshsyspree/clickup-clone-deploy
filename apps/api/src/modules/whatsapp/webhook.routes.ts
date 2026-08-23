import { Router } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import * as whatsappService from "./whatsapp.service";

export const whatsappWebhookRouter: Router = Router();

// Meta's one-time handshake when you register this URL in the App dashboard.
whatsappWebhookRouter.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && env.whatsappVerifyToken && token === env.whatsappVerifyToken) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

whatsappWebhookRouter.post(
  "/webhooks/whatsapp",
  asyncHandler(async (req, res) => {
    // req.rawBody is captured by the express.json() verify hook in app.ts —
    // needed here, not the parsed body, since the signature covers the raw bytes.
    const rawBody = (req as { rawBody?: Buffer }).rawBody;
    const signature = req.header("x-hub-signature-256");
    if (!rawBody || !whatsappService.verifyWebhookSignature(rawBody, signature)) {
      res.sendStatus(401);
      return;
    }

    const { messages, statuses } = whatsappService.parseWebhookPayload(req.body);
    for (const message of messages) {
      await whatsappService.receiveInbound(message);
    }
    for (const status of statuses) {
      await whatsappService.applyStatusUpdate(status);
    }

    // Meta requires a fast 200 regardless of what was inside — retries an
    // unacknowledged webhook repeatedly otherwise.
    res.sendStatus(200);
  }),
);
