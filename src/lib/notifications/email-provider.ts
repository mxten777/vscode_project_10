import { Resend } from "resend";
import type { NotificationProvider, NotificationPayload } from "./types";

export class EmailProvider implements NotificationProvider {
  private resend: Resend | null = null;
  private from: string;

  constructor() {
    this.from = (process.env.ALERT_FROM_EMAIL || "noreply@bidplatform.com").trim();
  }

  private getClient(): Resend | null {
    if (!this.resend) {
      const apiKey = (process.env.RESEND_API_KEY || "").trim();
      if (!apiKey || apiKey === "YOUR_RESEND_API_KEY") return null;
      this.resend = new Resend(apiKey);
    }
    return this.resend;
  }

  async send(payload: NotificationPayload) {
    try {
      const client = this.getClient();
      if (!client) {
        return { success: false, error: "RESEND_API_KEY is not configured" };
      }
      const { error } = await client.emails.send({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.body,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}
