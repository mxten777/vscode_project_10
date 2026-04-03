/**
 * 공고 제목 임베딩 + pgvector 유사 공고 검색 프록시
 * POST /api/ai/similar  { title: string, matchCount?: number }
 *
 * 흐름:
 *   1. bid-ai-service POST /predict/embed   → 768d 벡터
 *   2. Supabase RPC search_similar_tenders  → 코사인 유사도 상위 N건
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { apiResponse } from "@/lib/api-response";
import { createServiceClient } from "@/lib/supabase/service";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  if (!AI_SERVICE_URL) {
    return apiResponse.error("AI 서비스가 설정되지 않았습니다.", 503);
  }

  const { title, matchCount = 10, matchThreshold = 0.7 } = await request.json();

  if (!title?.trim()) {
    return apiResponse.error("title은 필수입니다.", 400);
  }

  // 1) 임베딩 요청
  const embedRes = await fetch(`${AI_SERVICE_URL}/predict/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AI_SERVICE_API_KEY ?? "",
    },
    body: JSON.stringify({ text: title }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!embedRes.ok) {
    return apiResponse.error("임베딩 생성 실패", 502);
  }

  const { embedding } = await embedRes.json();

  // 2) pgvector 유사 공고 검색
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("search_similar_tenders", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    return apiResponse.error(error.message, 500);
  }

  return NextResponse.json({ results: data ?? [] });
}
