import { successResponse } from "@/lib/api-response";

/**
 * GET /api/health
 * Vercel/로드밸런서 헬스 체크
 */
export function GET() {
  return successResponse({ status: "ok", timestamp: new Date().toISOString() });
}
