import type { NotificationProvider, NotificationPayload } from "./types";

/**
 * Kakao 알림톡 모킹 Provider
 * MVP에서는 콘솔 로그만 출력한다.
 * 실 발송은 Kakao 비즈메시지 API 연동 후 교체.
 */
export class KakaoProvider implements NotificationProvider {
  async send(payload: NotificationPayload) {
    console.log("[KakaoProvider MOCK] 알림톡 발송:", {
      to: payload.to,
      subject: payload.subject,
      bodyLength: payload.body.length,
    });
    return { success: true };
  }
}
