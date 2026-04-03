/**
 * 공고 제목 batch 임베딩 → tenders.title_embedding 업데이트
 * POST /api/ai/embed-batch  (Cron Job용, CRON_SECRET 인증)
 *
 * 흐름:
 *   1. tenders WHERE title_embedding IS NULL LIMIT 200 조회
 *   2. bid-ai-service POST /predict/embed/batch → 벡터 배열
 *   3. tenders.title_embedding 업데이트
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;
const BATCH_SIZE = 200;

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!AI_SERVICE_URL) {
    return NextResponse.json({ error: "AI 서비스 미설정" }, { status: 503 });
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
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!tenders || tenders.length === 0) {
    return NextResponse.json({ success: true, updated: 0, message: "모든 공고 임베딩 완료" });
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
    return NextResponse.json({ error: "임베딩 요청 실패" }, { status: 502 });
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

  return NextResponse.json({ success: true, updated, total: tenders.length });
}
