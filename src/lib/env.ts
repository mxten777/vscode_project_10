/**
 * 서버 환경변수 검증 모듈
 * 서버 시작 시점에 필수 환경변수가 없으면 즉시 오류를 발생시킵니다.
 * 클라이언트 번들에는 포함되지 않습니다 (server-only 패턴).
 */
import { z } from "zod";

const serverEnvSchema = z.object({
  // 나라장터 API
  NARA_API_KEY: z.string().min(1, "NARA_API_KEY가 설정되지 않았습니다"),
  NARA_API_BASE_URL: z.string().url().optional(),
  NARA_AWARD_API_KEY: z.string().min(1).optional(),

  // Supabase (서버)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL이 유효한 URL이 아닙니다"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다").optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY가 설정되지 않았습니다").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET가 설정되지 않았습니다").optional(),

  // Upstash Redis (rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // AI 서비스
  AI_SERVICE_URL: z.string().url().optional(),
  AI_SERVICE_API_KEY: z.string().min(1).optional(),

  // 기타
  CRON_SECRET: z.string().min(1, "CRON_SECRET가 설정되지 않았습니다").optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  ADMIN_CONSOLE_EMAILS: z.string().optional(),
});

/**
 * 서버 환경변수 파싱 결과.
 * 필수 환경변수가 없으면 서버 시작 시점에 오류를 발생시킵니다.
 */
function parseServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`[env] 환경변수 설정 오류:\n${missing}`);
  }
  return result.data;
}

// Node.js 서버 환경에서만 실행 (클라이언트 번들 포함 방지)
const isServer = typeof window === "undefined";

export const env = isServer ? parseServerEnv() : ({} as ReturnType<typeof parseServerEnv>);
