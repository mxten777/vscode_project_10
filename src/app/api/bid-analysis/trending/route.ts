/**
 * GET /api/bid-analysis/trending
 * 실데이터 기반 트렌딩 키워드
 */
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { getTrendingKeywords } from "@/lib/bid-intelligence-service";
import { apiResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  const days = parseInt(request.nextUrl.searchParams.get("days") || "7");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

  try {
    const keywords = await getTrendingKeywords(
      Math.min(Math.max(days, 1), 30),
      Math.min(limit, 20)
    );
    return apiResponse.success(keywords);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return apiResponse.error(msg, 500);
  }
}
