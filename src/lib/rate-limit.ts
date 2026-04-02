/**
 * In-memory sliding-window rate limiter (Edge-compatible)
 *
 * 한계: Vercel serverless 특성상 인스턴스 간 공유 불가.
 *       단일 인스턴스 내에서는 효과적으로 동작.
 *       프로덕션 스케일업 시 Upstash Redis(@upstash/ratelimit)로 교체 권장.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** 윈도우 크기 (ms) */
  windowMs: number;
  /** 윈도우 내 최대 요청 수 */
  max: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= config.windowMs) {
    // 새 윈도우 시작
    store.set(key, { count: 1, windowStart: now });
    return { success: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.max) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.windowStart + config.windowMs,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.max - entry.count,
    resetAt: entry.windowStart + config.windowMs,
  };
}

// 주기적으로 만료 항목 정리 (메모리 누수 방지)
// Edge Worker 재시작 시 자동 초기화되므로 단순 조건 체크로 충분
export function cleanExpiredEntries(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= windowMs) {
      store.delete(key);
    }
  }
}
