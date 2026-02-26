/**
 * 알림 채널 추상화 — Provider 인터페이스
 */
export interface NotificationPayload {
  to: string; // email or kakao id
  subject: string;
  body: string;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }>;
}
