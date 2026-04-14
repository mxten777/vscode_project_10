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
async function sleep(ms: number) {
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

/**
 * 나라장터 원본 날짜 문자열 포맷 (가공 없이 표시)
 * raw_json의 bidNtceDt/bidClseDt → "YYYY. M. D." or "YYYY. M. D. HH:MM"
 * 없으면 published_at ISO 문자열을 fallback으로 사용
 */
export function formatRawDate(
  rawJson: Record<string, unknown> | null | undefined,
  field: "bidNtceDt" | "bidClseDt",
  fallbackIso: string | null | undefined,
  includeTime = false
): string {
  const raw = rawJson?.[field] as string | undefined;
  const src = raw || fallbackIso;
  if (!src) return "-";
  // "2026-03-03 09:40:03" 또는 ISO 형식에서 날짜/시간 파싱 (timezone 변환 없이)
  const match = src.match(/^(\d{4})[^\d](\d{2})[^\d](\d{2})(?:[^\d](\d{2})[:.](\d{2}))?/);
  if (!match) return src;
  const [, y, m, d, hh, mm] = match;
  const datePart = `${y}. ${parseInt(m)}. ${parseInt(d)}.`;
  if (includeTime && hh && mm) return `${datePart} ${hh}:${mm}`;
  return datePart;
}

/**
 * D-day 계산 (공통 버전)
 * deadline이 있고 미래이면 { label, urgent, days, cls } 반환
 */
export function getDday(deadline: string | null): {
  label: string;
  urgent: boolean;
  days: number;
  cls: string;
} | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;

  const label = diff === 0 ? "D-DAY" : `D-${diff}`;
  const urgent = diff <= 3;
  const cls = urgent ? "dday-urgent" : diff <= 7 ? "dday-warning" : "dday-safe";

  return { label, urgent, days: diff, cls };
}

/**
 * 신규 공고 판별 (48시간 이내)
 */
export function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  return Date.now() - new Date(publishedAt).getTime() < 48 * 60 * 60 * 1000;
}

/**
 * 예산 금액을 간략하게 포맷 (조/억/천만/만)
 */
export function formatBudgetCompact(amount: number | null | undefined): string {
  if (!amount) return "-";
  if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(1)}조`;
  if (amount >= 100_000_000) return `${Math.round(amount / 100_000_000)}억`;
  if (amount >= 10_000_000) return `${Math.round(amount / 10_000_000)}천만`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000)}만`;
  return `${amount.toLocaleString()}원`;
}

/**
 * 나라장터 날짜 파싱 (YYYYMMDD 또는 YYYYMMDDHHmmss → UTC ISO)
 * 나라장터 시각은 KST(+09:00) 기준
 */
export function parseNaraDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const cleaned = dateStr.replace(/[^0-9]/g, "");
  if (cleaned.length === 8) {
    return new Date(
      `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}T00:00:00+09:00`
    ).toISOString();
  }
  if (cleaned.length >= 12) {
    return new Date(
      `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}` +
      `T${cleaned.slice(8, 10)}:${cleaned.slice(10, 12)}:${cleaned.length >= 14 ? cleaned.slice(12, 14) : "00"}+09:00`
    ).toISOString();
  }
  return new Date().toISOString();
}
