/**
 * POST /api/jobs/backfill-participants
 * awards 테이블 → bid_participants 테이블 백필
 *
 * awards에 있는 낙찰자(rank=1, is_winner=true) 데이터를 bid_participants로 복사.
 * 향후 naramarket API에서 전순위 데이터를 수집할 때 rank 2+ 추가 예정.
 *
 * 사용: 수동 1회 실행 (최초 배포 or 데이터 유실 시)
 *   curl -X POST https://bid-platform.vercel.app/api/jobs/backfill-participants \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
import { NextRequest } from "next/server";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";
import { getErrorMessage } from "@/lib/job-utils";

export const preferredRegion = "icn1";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const supabase = createServiceClient();

  // 처리 배치 크기 (타임아웃 방어)
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "500");
  // 이미 bid_participants에 있는 notice_no 를 skip할지 여부
  const skipExisting = request.nextUrl.searchParams.get("skip_existing") !== "false";

  try {
    // 1. awards 전체 조회 (tender 연관 포함)
    const { data: awards, error: aErr } = await supabase
      .from("awards")
      .select(
        "id, tender_id, winner_company_name, bidder_registration_no, awarded_amount, awarded_rate, bid_notice_no, bid_notice_ord, participant_count, opened_at, raw_json"
      )
      .not("winner_company_name", "is", null)
      .not("bid_notice_no", "is", null)
      .order("opened_at", { ascending: false })
      .limit(limit);

    if (aErr) {
      return internalErrorResponse(aErr.message);
    }
    if (!awards || awards.length === 0) {
      return successResponse({ success: true, processed: 0, message: "awards 테이블이 비어 있습니다." });
    }

    // 2. 이미 bid_participants에 있는 notice_no 목록 (skip_existing=true 일 때)
    const existingSet = new Set<string>();
    if (skipExisting) {
      const noticeNos = [...new Set(awards.map((a) => a.bid_notice_no).filter(Boolean))];
      if (noticeNos.length > 0) {
        const { data: existing } = await supabase
          .from("bid_participants")
          .select("notice_no")
          .in("notice_no", noticeNos);
        for (const row of existing ?? []) existingSet.add(row.notice_no);
      }
    }

    // 3. bid_participants rows 구성 (낙찰자 = rank 1, is_winner = true)
    const rows = awards
      .filter((a) => !existingSet.has(a.bid_notice_no))
      .map((a) => ({
        tender_id: a.tender_id,
        notice_no: a.bid_notice_no,
        notice_ord: a.bid_notice_ord ?? "00",
        company_name: a.winner_company_name,
        bid_rank: 1,
        bid_amount: a.awarded_amount ?? null,
        bid_rate: a.awarded_rate ?? null,
        is_winner: true,
        raw_json: a.raw_json ?? null,
      }));

    if (rows.length === 0) {
      return successResponse({
        success: true,
        processed: 0,
        skipped: awards.length,
        message: "이미 모두 bid_participants에 존재합니다.",
      });
    }

    // 4. bulk upsert (notice_no + company_name + bid_rank 기준)
    const { error: uErr } = await supabase
      .from("bid_participants")
      .upsert(rows, { onConflict: "notice_no,notice_ord,company_name,bid_rank", ignoreDuplicates: true });

    if (uErr) {
      // UNIQUE constraint 없으면 insert 로 fallback
      const { error: iErr, count } = await supabase
        .from("bid_participants")
        .insert(rows, { count: "exact" });
      if (iErr) return internalErrorResponse(`insert failed: ${iErr.message}`);
      return successResponse({ success: true, processed: count ?? rows.length, skipped: awards.length - rows.length });
    }

    return successResponse({
      success: true,
      processed: rows.length,
      skipped: awards.length - rows.length,
      total_awards: awards.length,
    });
  } catch (err) {
    const message = getErrorMessage(err);
    return internalErrorResponse(message);
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
