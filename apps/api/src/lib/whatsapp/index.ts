import { env, isWhatsAppConfigured } from "../../config/env";

export interface WhatsAppProvider {
  send(to: string, body: string): Promise<void>;
}

class ConsoleWhatsAppProvider implements WhatsAppProvider {
  async send(to: string, body: string): Promise<void> {
    // Dev default: no WhatsApp Business API credentials configured, so
    // messages are logged here instead of actually sent. Set
    // WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID (from a Meta
    // Developer app's WhatsApp product) to send for real.
    console.log("\n──────── 💬 WHATSAPP (console provider) ────────");
    console.log(`To: ${to}`);
    console.log(body);
    console.log("─────────────────────────────────────────────────\n");
  }
}

/**
 * Sends via Meta's WhatsApp Cloud API. Requires the number to have messaged
 * this business within the last 24h, OR a pre-approved template — this sends
 * a plain free-form text message, so it will fail with a real Meta API error
 * outside that window. There is no template-message support here.
 */
class MetaWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  async send(to: string, body: string): Promise<void> {
    const res = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/[^\d+]/g, ""),
        type: "text",
        text: { body },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
    }
  }
}

function createWhatsAppProvider(): WhatsAppProvider {
  if (isWhatsAppConfigured) {
    return new MetaWhatsAppProvider(env.whatsappPhoneNumberId!, env.whatsappAccessToken!);
  }
  console.warn(
    "[whatsapp] WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID missing — falling back to console provider.",
  );
  return new ConsoleWhatsAppProvider();
}

export const whatsappProvider: WhatsAppProvider = createWhatsAppProvider();

/** Whether outbound WhatsApp messages are actually being sent, not just logged to the console. */
export const whatsappIsLive = isWhatsAppConfigured;
