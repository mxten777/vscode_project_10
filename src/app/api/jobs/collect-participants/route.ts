/**
 * GET /api/jobs/collect-participants
 * 선별 bid_participants 수집 (레벨 2/3 공고 대상)
 *
 * 수집 기준 (analysis_level >= 2 OR 하기 조건 중 1개 이상):
 *   - 마감 7일 이내 (OPEN)
 *   - 예산 1억 이상
 *   - 즐겨찾기 등록된 공고
 *   - participants_collected = false AND status IN (CLOSED, RESULT) → 낙찰 결과 있음
 *
 * awards 테이블에서 낙찰자(rank=1)를 bid_participants로 저장한다.
 * 향후 NARA 개찰순위 상세 API 연동 시 rank 2+ 추가 가능.
 *
 * Schedule: 매일 새벽 3시 KST (18:00 UTC 전날)
 *   vercel.json: "0 18 * * *"
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";

export const preferredRegion = "icn1";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "200");

  try {
    // 1. 먼저 analysis_level 재계산
    const { data: levelData } = await supabase.rpc("compute_analysis_levels");

    // 2. 대상 공고 조회
    //    - OPEN: analysis_level >= 2 (마감 7일 이내 / 예산 1억+) + participants 미수집
    //    - CLOSED/RESULT: 레벨 무관 + awards 있음 + participants 미수집
    const { data: targets, error: tErr } = await supabase
      .from("tenders")
      .select("id, source_tender_id, status, analysis_level, budget_amount, deadline_at")
      .eq("participants_collected", false)
      .or("status.in.(CLOSED,RESULT),and(status.eq.OPEN,analysis_level.gte.2)")
      .order("status", { ascending: true }) // CLOSED/RESULT 먼저
      .order("budget_amount", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (tErr) throw tErr;
    if (!targets || targets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "수집 대상 없음",
        level_updates: levelData,
        processed: 0,
      });
    }

    const tenderIds = targets.map((t) => t.id);

    // 3. awards 일괄 조회
    const { data: awards, error: aErr } = await supabase
      .from("awards")
      .select("tender_id, winner_company_name, awarded_amount, awarded_rate, bid_notice_no, bid_notice_ord, raw_json")
      .in("tender_id", tenderIds)
      .not("winner_company_name", "is", null);

    if (aErr) throw aErr;

    if (!awards || awards.length === 0) {
      return NextResponse.json({
        success: true,
        message: "매칭되는 awards 없음",
        level_updates: levelData,
        candidates: targets.length,
        processed: 0,
      });
    }

    // 4. bid_participants rows 구성
    const awardsByTender = new Map<string, typeof awards[0]>();
    for (const a of awards) {
      if (a.tender_id) awardsByTender.set(a.tender_id, a);
    }

    const participantRows = [];
    const processedTenderIds: string[] = [];

    for (const tender of targets) {
      const award = awardsByTender.get(tender.id);
      if (!award || !award.winner_company_name || !award.bid_notice_no) continue;

      participantRows.push({
        tender_id: tender.id,
        notice_no: award.bid_notice_no,
        notice_ord: award.bid_notice_ord ?? "00",
        company_name: award.winner_company_name,
        bid_rank: 1,
        bid_amount: award.awarded_amount ?? null,
        bid_rate: award.awarded_rate ?? null,
        is_winner: true,
        raw_json: award.raw_json ?? null,
      });
      processedTenderIds.push(tender.id);
    }

    if (participantRows.length === 0) {
      return NextResponse.json({
        success: true,
        level_updates: levelData,
        candidates: targets.length,
        processed: 0,
      });
    }

    // 5. bid_participants upsert
    const { error: uErr } = await supabase.from("bid_participants").upsert(
      participantRows,
      { onConflict: "notice_no,notice_ord,company_name,bid_rank", ignoreDuplicates: true }
    );
    if (uErr) throw uErr;

    // 6. participants_collected 플래그 업데이트
    await supabase
      .from("tenders")
      .update({
        participants_collected: true,
        participants_collected_at: new Date().toISOString(),
        analysis_level: 3, // 수집 완료 → 레벨 3 승격
      })
      .in("id", processedTenderIds);

    return NextResponse.json({
      success: true,
      level_updates: levelData,
      candidates: targets.length,
      processed: participantRows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
