/**
 * AI 입찰 인사이트 API v2
 * GET /api/bid-analysis/insights?limit=10&refresh=false
 *
 * analysis_cache → get_ai_insights_v2() RPC 순으로 조회
 * 회사 프로파일이 있으면 개인화 파라미터 전달
 * 4가지 카테고리 반환 (중복 제거됨):
 *   recommended      — 종합 추천 (1순위 풀)
 *   high_probability — 낙찰 가능성 높음 (2순위 풀)
 *   low_competition  — 경쟁 적음 (3순위 풀)
 *   high_profitability — 수익성 높음 (4순위 풀)
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiResponse } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-context";

const CACHE_KEY_GLOBAL = "ai_insights_v2_global";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6시간

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { user } = ctx;
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "8"),
      20
    );
    const forceRefresh =
      request.nextUrl.searchParams.get("refresh") === "true";

    const supabase = createServiceClient();

    // ── 1. 회사 프로파일 조회 (개인화 파라미터 준비) ──────────────
    const { data: profile } = await supabase
      .from("company_profiles")
      .select(
        "industry_codes, region_codes, preferred_agency_names, min_budget, max_budget"
      )
      .eq("user_id", user.id)
      .single();

    const isPersonalized = !!(
      profile &&
      (profile.industry_codes?.length > 0 || profile.region_codes?.length > 0)
    );

    // 개인화 요청이면 캐시 우회, 글로벌 요청이면 캐시 사용
    if (!forceRefresh && !isPersonalized) {
      const { data: cached } = await supabase
        .from("analysis_cache")
        .select("data, computed_at")
        .eq("cache_key", CACHE_KEY_GLOBAL)
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

    // ── 2. RPC 호출 (v2 — 중복 제거 + 이유 + 품질 포함) ───────────
    const rpcParams: Record<string, unknown> = { p_limit: limit };
    if (isPersonalized && profile) {
      rpcParams.p_user_id = user.id;
      if (profile.industry_codes?.length > 0)
        rpcParams.p_industry_codes = profile.industry_codes;
      if (profile.region_codes?.length > 0)
        rpcParams.p_region_codes = profile.region_codes;
      if (profile.preferred_agency_names?.length > 0)
        rpcParams.p_agency_names = profile.preferred_agency_names;
      if (profile.min_budget) rpcParams.p_min_budget = profile.min_budget;
      if (profile.max_budget) rpcParams.p_max_budget = profile.max_budget;
    }

    const { data, error } = await supabase.rpc(
      "get_ai_insights_v2",
      rpcParams
    );

    if (error) {
      console.error("[insights v2] RPC error:", error);
      return apiResponse.error("Failed to compute AI insights", 500);
    }

    const result = data as Record<string, unknown>;

    // ── 3. 글로벌 캐시 저장 (개인화 아닐 때만) ────────────────────
    if (!isPersonalized) {
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
      supabase
        .from("analysis_cache")
        .upsert(
          {
            cache_key: CACHE_KEY_GLOBAL,
            data: result,
            computed_at: new Date().toISOString(),
            expires_at: expiresAt,
          },
          { onConflict: "cache_key" }
        )
        .then(({ error: cacheErr }) => {
          if (cacheErr)
            console.warn("[insights v2] cache upsert failed:", cacheErr);
        });
    }

    return apiResponse.success({ ...result, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[insights v2] Error:", err);
    return apiResponse.error(message);
  }
}
