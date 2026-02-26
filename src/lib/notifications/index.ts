import type { NotificationProvider } from "./types";
import { EmailProvider } from "./email-provider";
import { KakaoProvider } from "./kakao-provider";

export type { NotificationProvider, NotificationPayload } from "./types";

const providers: Record<string, NotificationProvider> = {
  EMAIL: new EmailProvider(),
  KAKAO: new KakaoProvider(),
};

export function getNotificationProvider(channel: string): NotificationProvider {
  return providers[channel] ?? providers.EMAIL;
}
