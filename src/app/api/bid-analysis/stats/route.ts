/**
 * 낙찰 통계 대시보드 API
 * GET /api/bid-analysis/stats?type=agency|industry|region&value=xxx&months=6
 *
 * 집계는 get_bid_stats() DB 함수에서 처리 (migration 010)
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type") || "overall";
    const value = request.nextUrl.searchParams.get("value") || null;
    const months = parseInt(request.nextUrl.searchParams.get("months") || "6");

    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("get_bid_stats", {
      filter_type: type,
      filter_value: value,
      months_back: months,
      top_n: 10,
    });

    if (error) {
      console.error("[stats] RPC error:", error);
      return apiResponse.error("Failed to fetch statistics", 500);
    }

    if (!data || (data as { total_bids?: number }).total_bids === 0) {
      return apiResponse.success({
        total_bids: 0,
        message: "No data available for the specified criteria",
      });
    }

    // type에 따라 top_categories 결정 (프론트엔드 호환성 유지)
    const topCategories =
      type === "region" ? (data as Record<string, unknown>).top_regions
      : type === "industry" ? (data as Record<string, unknown>).top_industries
      : (data as Record<string, unknown>).top_agencies;

    return apiResponse.success({
      ...(data as Record<string, unknown>),
      filter: { type, value, months },
      top_categories: topCategories,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[stats] Error:", error);
    return apiResponse.error(message);
  }
}

