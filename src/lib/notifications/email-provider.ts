import { Resend } from "resend";
import type { NotificationProvider, NotificationPayload } from "./types";

export class EmailProvider implements NotificationProvider {
  private resend: Resend;
  private from: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.from = process.env.ALERT_FROM_EMAIL || "noreply@bidplatform.com";
  }

  async send(payload: NotificationPayload) {
    try {
      const { error } = await this.resend.emails.send({
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
