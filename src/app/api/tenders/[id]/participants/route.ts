/**
 * GET /api/tenders/:id/participants
 * 공고 상세 접근 시 bid_participants 온디맨드 수집 + 반환
 *
 * 동작:
 *   1. bid_participants 기존 데이터 조회
 *   2. 없으면 → awards에서 즉시 수집 후 저장
 *   3. analysis_level / data_quality 반환
 *
 * 수집 트리거 조건 (하나라도 해당 시):
 *   - 즐겨찾기 등록
 *   - 마감 7일 이내
 *   - 예산 1억 이상
 *   - analysis_level >= 2
 *   - CLOSED/RESULT 상태 (결과 있음)
 */
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { apiResponse } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;
  const { supabase, user, orgId } = ctx;

  const { id: tenderId } = await params;

  // 1. 공고 정보 조회
  const { data: tender, error: tErr } = await supabase
    .from("tenders")
    .select("id, source_tender_id, status, budget_amount, deadline_at, analysis_level, participants_collected")
    .eq("id", tenderId)
    .single();

  if (tErr || !tender) return apiResponse.error("공고를 찾을 수 없습니다", 404);

  // 2. 즐겨찾기 여부 확인
  let isFavorited = false;
  if (user && orgId) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .eq("tender_id", tenderId)
      .maybeSingle();
    isFavorited = !!fav;
  }

  // 3. 기존 bid_participants 조회
  const { data: existing } = await supabase
    .from("bid_participants")
    .select("*")
    .eq("tender_id", tenderId)
    .order("bid_rank", { ascending: true });

  if (existing && existing.length > 0) {
    return apiResponse.success({
      participants: existing,
      data_quality: "real",
      analysis_level: tender.analysis_level ?? 1,
      source: "cache",
    });
  }

  // 4. 수집 가능 조건 확인
  const now = new Date();
  const deadlineAt = tender.deadline_at ? new Date(tender.deadline_at) : null;
  const daysToDeadline = deadlineAt ? (deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : null;

  const canCollect =
    isFavorited ||
    (daysToDeadline !== null && daysToDeadline <= 7) ||
    (tender.budget_amount !== null && tender.budget_amount >= 100_000_000) ||
    (tender.analysis_level !== null && tender.analysis_level >= 2) ||
    tender.status === "CLOSED" ||
    tender.status === "RESULT";

  if (!canCollect) {
    return apiResponse.success({
      participants: [],
      data_quality: "insufficient",
      analysis_level: tender.analysis_level ?? 1,
      message: "기본 분석 대상입니다. 즐겨찾기 추가 시 정밀 분석이 시작됩니다.",
      source: "none",
    });
  }

  // 5. awards에서 즉시 수집
  const { data: award } = await supabase
    .from("awards")
    .select("tender_id, winner_company_name, awarded_amount, awarded_rate, bid_notice_no, bid_notice_ord, participant_count, raw_json")
    .eq("tender_id", tenderId)
    .not("winner_company_name", "is", null)
    .maybeSingle();

  if (!award || !award.winner_company_name || !award.bid_notice_no) {
    return apiResponse.success({
      participants: [],
      data_quality: "partial",
      analysis_level: tender.analysis_level ?? 1,
      message: "낙찰 결과 데이터가 아직 수집되지 않았습니다.",
      source: "none",
    });
  }

  // 6. bid_participants에 저장
  const row = {
    tender_id: tenderId,
    notice_no: award.bid_notice_no,
    notice_ord: award.bid_notice_ord ?? "00",
    company_name: award.winner_company_name,
    bid_rank: 1,
    bid_amount: award.awarded_amount ?? null,
    bid_rate: award.awarded_rate ?? null,
    is_winner: true,
    raw_json: award.raw_json ?? null,
  };

  const { error: uErr } = await supabase
    .from("bid_participants")
    .upsert([row], { onConflict: "notice_no,notice_ord,company_name,bid_rank", ignoreDuplicates: true });

  // 7. analysis_level 승격 + collected 플래그 업데이트
  await supabase
    .from("tenders")
    .update({
      participants_collected: true,
      participants_collected_at: new Date().toISOString(),
      analysis_level: Math.max(tender.analysis_level ?? 1, 3),
    })
    .eq("id", tenderId);

  if (uErr) {
    // 저장 실패해도 데이터 반환
    return apiResponse.success({
      participants: [row],
      data_quality: "partial",
      analysis_level: 2,
      message: "저장 중 오류가 발생했습니다.",
      source: "live",
    });
  }

  // 8. 저장된 데이터 반환
  const { data: fresh } = await supabase
    .from("bid_participants")
    .select("*")
    .eq("tender_id", tenderId)
    .order("bid_rank", { ascending: true });

  return apiResponse.success({
    participants: fresh ?? [row],
    data_quality: "real",
    analysis_level: 3,
    participant_count: award.participant_count ?? null,
    source: "live",
  });
}
