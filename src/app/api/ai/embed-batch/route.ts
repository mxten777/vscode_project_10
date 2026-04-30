/**
 * 공고 제목 batch 임베딩 → tenders.title_embedding 업데이트
 * POST /api/ai/embed-batch  (Cron Job용, CRON_SECRET 인증)
 *
 * 흐름:
 *   1. tenders WHERE title_embedding IS NULL LIMIT 200 조회
 *   2. bid-ai-service POST /predict/embed/batch → 벡터 배열
 *   3. tenders.title_embedding 업데이트
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { verifyCronSecret } from "@/lib/helpers";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;
const BATCH_SIZE = 200;

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  if (!AI_SERVICE_URL) {
    return errorResponse("AI_NOT_CONFIGURED", "AI 서비스 미설정", 503);
  }

  const supabase = createServiceClient();

  // 임베딩 미생성 공고 조회
  const { data: tenders, error: fetchError } = await supabase
    .from("tenders")
    .select("id, title")
    .is("title_embedding", null)
    .not("title", "is", null)
    .limit(BATCH_SIZE);

  if (fetchError) {
    return internalErrorResponse(fetchError.message);
  }

  if (!tenders || tenders.length === 0) {
    return successResponse({ success: true, updated: 0, message: "모든 공고 임베딩 완료" });
  }

  // 배치 임베딩 요청
  const embedRes = await fetch(`${AI_SERVICE_URL}/predict/embed/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AI_SERVICE_API_KEY ?? "",
    },
    body: JSON.stringify({ texts: tenders.map((t) => t.title) }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!embedRes.ok) {
    return errorResponse("UPSTREAM_ERROR", "임베딩 요청 실패", 502);
  }

  const { embeddings } = await embedRes.json();

  // tenders 업데이트
  let updated = 0;
  for (let i = 0; i < tenders.length; i++) {
    const { error: updateError } = await supabase
      .from("tenders")
      .update({ title_embedding: JSON.stringify(embeddings[i]) })
      .eq("id", tenders[i].id);

    if (!updateError) updated++;
  }

  return successResponse({ success: true, updated, total: tenders.length });
}
