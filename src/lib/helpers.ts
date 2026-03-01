import { NextRequest } from "next/server";

/**
 * Vercel Cron / 내부 Job 호출 시 시크릿 키 검증
 */
export function verifyCronSecret(request: NextRequest): boolean {
  if (!process.env.CRON_SECRET) {
    console.error("[security] CRON_SECRET 환경변수가 설정되지 않았습니다 — Job 접근을 차단합니다");
    return false;
  }
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return authHeader === expected;
}

/**
 * 간단 지수 백오프 sleep
 */
export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }
  throw lastError;
}

/**
 * 금액 포맷 (한국 원화)
 */
export function formatKRW(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 상태 한글 라벨
 */
export function tenderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: "진행중",
    CLOSED: "마감",
    RESULT: "결과발표",
  };
  return map[status] ?? status;
}
