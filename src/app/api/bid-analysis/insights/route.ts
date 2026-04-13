/**
 * AI 입찰 인사이트 API
 * GET /api/bid-analysis/insights?limit=10&refresh=false
 *
 * analysis_cache → get_ai_insights() RPC 순으로 조회
 * 4가지 카테고리 반환:
 *   recommended     — 낙찰 가능성 종합 순위
 *   high_probability — 낙찰 가능성 65% 이상
 *   low_competition  — 평균 경쟁업체 수 최소
 *   high_profitability — 예산×낙찰가능성 최대
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiResponse } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-context";

const CACHE_KEY = "ai_insights_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6시간

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "8"),
      20
    );
    const forceRefresh =
      request.nextUrl.searchParams.get("refresh") === "true";

    const supabase = createServiceClient();

    // ── 1. 캐시 조회 ────────────────────────────────────────────────
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("analysis_cache")
        .select("data, computed_at")
        .eq("cache_key", CACHE_KEY)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (cached) {
        return apiResponse.success({
          ...(cached.data as Record<string, unknown>),
          cached: true,
          computed_at: (cached as Record<string, unknown>).computed_at,
        });
      }
    }

    // ── 2. RPC 호출 ─────────────────────────────────────────────────
    const { data, error } = await supabase.rpc("get_ai_insights", {
      p_limit: limit,
    });

    if (error) {
      console.error("[insights] RPC error:", error);
      return apiResponse.error("Failed to compute AI insights", 500);
    }

    const result = data as Record<string, unknown>;

    // ── 3. 캐시 저장 (비동기 — 응답 블로킹 없이) ────────────────────
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    supabase
      .from("analysis_cache")
      .upsert(
        {
          cache_key: CACHE_KEY,
          data: result,
          computed_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "cache_key" }
      )
      .then(({ error: cacheErr }) => {
        if (cacheErr) console.warn("[insights] cache upsert failed:", cacheErr);
      });

    return apiResponse.success({ ...result, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[insights] Error:", err);
    return apiResponse.error(message);
  }
}
