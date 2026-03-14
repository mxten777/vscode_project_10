/**
 * 투찰가 추천 API
 * GET /api/bid-analysis/recommend?tenderId=xxx
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const tenderId = request.nextUrl.searchParams.get("tenderId");

    if (!tenderId) {
      return apiResponse.error("tenderId is required", 400);
    }

    const supabase = await createClient();

    // 1) 캐시된 추천 결과 확인 (24시간 유효)
    const { data: cachedRecommendation } = await supabase
      .from("bid_recommendations")
      .select("*")
      .eq("tender_id", tenderId)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cachedRecommendation) {
      return apiResponse.success({
        ...cachedRecommendation,
        cached: true,
      });
    }

    // 2) 캐시 없음 → Postgres RPC 함수 호출하여 새로 계산
    const { data: recommendation, error: rpcError } = await supabase.rpc(
      "recommend_bid_price",
      {
        target_tender_id: tenderId,
        analysis_months: 12,
      }
    );

    if (rpcError) {
      console.error("[recommend] RPC error:", rpcError);
      return apiResponse.error("Failed to calculate recommendation", 500);
    }

    // 에러 응답 확인
    if (recommendation?.error) {
      return apiResponse.error(recommendation.message || "Insufficient data", 400, {
        code: recommendation.error,
        details: recommendation,
      });
    }

    // 3) 추천 결과 캐시 저장 (24시간)
    const { data: savedRecommendation, error: saveError } = await supabase
      .from("bid_recommendations")
      .upsert(
        {
          tender_id: tenderId,
          
          conservative_rate: recommendation.conservative.rate,
          conservative_amount: recommendation.conservative.amount,
          conservative_confidence: recommendation.conservative.confidence,
          
          standard_rate: recommendation.standard.rate,
          standard_amount: recommendation.standard.amount,
          standard_confidence: recommendation.standard.confidence,
          
          aggressive_rate: recommendation.aggressive.rate,
          aggressive_amount: recommendation.aggressive.amount,
          aggressive_confidence: recommendation.aggressive.confidence,
          
          similar_bids_count: recommendation.metadata.similar_count,
          analysis_period_months: recommendation.metadata.analysis_months,
          data_quality_score: recommendation.metadata.data_quality,
          
          warnings: recommendation.warnings || [],
          explanation: recommendation.metadata.stats,
          
          recommended_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "tender_id" }
      )
      .select()
      .single();

    if (saveError) {
      console.error("[recommend] Cache save error:", saveError);
      // 캐시 저장 실패해도 추천 결과는 반환
    }

    return apiResponse.success({
      ...(savedRecommendation || recommendation),
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[recommend] Error:", error);
    return apiResponse.error(message);
  }
}
