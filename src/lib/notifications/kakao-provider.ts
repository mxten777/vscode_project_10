import type { NotificationProvider, NotificationPayload } from "./types";

/**
 * Kakao 알림톡 Provider (placeholder)
 * 실 발송은 Kakao 비즈메시지 API 연동 후 구현.
 */
export class KakaoProvider implements NotificationProvider {
  async send(_payload: NotificationPayload) {
    return { success: false, error: "Kakao provider not implemented" };
  }
}
