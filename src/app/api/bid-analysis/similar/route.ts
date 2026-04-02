/**
 * 유사 낙찰 사례 검색 API
 * GET /api/bid-analysis/similar?tenderId=xxx&limit=20
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiResponse } from "@/lib/api-response";
import type { SimilarBid } from "@/lib/types";
import { getAuthContext } from "@/lib/auth-context";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const tenderId = request.nextUrl.searchParams.get("tenderId");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

    if (!tenderId) {
      return apiResponse.error("tenderId is required", 400);
    }

    const supabase = createServiceClient();

    // Postgres RPC 함수 호출: get_similar_bids
    const { data: similarBids, error: rpcError } = await supabase.rpc("get_similar_bids", {
      target_tender_id: tenderId,
      similarity_weights: null, // 기본 가중치 사용
      max_results: limit,
      months_back: 12,
    });

    if (rpcError) {
      console.error("[similar] RPC error:", rpcError);
      return apiResponse.error("Failed to find similar bids", 500);
    }

    // 유사도 점수별 그룹화
    const grouped = {
      high: similarBids.filter((b: SimilarBid) => b.similarity_score >= 0.7),
      medium: similarBids.filter((b: SimilarBid) => b.similarity_score >= 0.4 && b.similarity_score < 0.7),
      low: similarBids.filter((b: SimilarBid) => b.similarity_score >= 0.3 && b.similarity_score < 0.4),
    };

    return apiResponse.success({
      total: similarBids.length,
      items: similarBids,
      grouped,
      summary: {
        high_similarity: grouped.high.length,
        medium_similarity: grouped.medium.length,
        low_similarity: grouped.low.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[similar] Error:", error);
    return apiResponse.error(message);
  }
}
