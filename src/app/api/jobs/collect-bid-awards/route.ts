/**
 * 낙찰 데이터 수집 Job
 * 
 * 나라장터 API:
 * - 개찰결과 API: /getBidPblancListInfoThngCnstwk (개찰정보조회)
 * - 낙찰정보 API: /getBidPblancListInfoPSSrch (낙찰정보조회)
 * 
 * Schedule: Vercel Cron (평일 09:10 UTC = 18:10 KST)
 */

import { NextRequest } from "next/server";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret, parseNaraDate } from "@/lib/helpers";
import { failCollectionJob, finishCollectionJob, startCollectionJob } from "@/lib/collection-logs";
import { getErrorMessage, parseBoundedInt } from "@/lib/job-utils";
import type { SupabaseClient } from "@supabase/supabase-js";

// 나라장터 API 타입 (getScsbidListSttusServc 기준)
interface NaramarketBidResult {
  bidNtceNo: string;       // 입찰공고번호
  bidNtceOrd: string;      // 입찰공고차수
  bidNtceNm: string;       // 입찰공고명
  dminsttNm: string;       // 수요기관명
  dminsttCd: string;       // 수요기관코드
  rbidNo: string;          // 재입찰번호

  // 개찰 결과
  rlOpengDt: string;       // 개찰일시
  prtcptCnum: number;      // 참가업체수

  // 낙찰 결과
  bidwinnrNm: string;      // 낙찰자명
  bidwinnrBizno: string;   // 낙찰자 사업자번호
  sucsfbidAmt: number;     // 낙찰금액
  sucsfbidRate: number;    // 낙찰률

  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  let logId: string | null = null;
  const supabase = createServiceClient();

  try {
    // Cron secret 검증
    if (!verifyCronSecret(request)) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    logId = await startCollectionJob(supabase, "awards");
    // 낙찰정보서비스는 별도 키 사용 (NARA_AWARD_API_KEY), 없으면 NARA_API_KEY fallback
    const NARAMARKET_API_KEY = process.env.NARA_AWARD_API_KEY || process.env.NARA_API_KEY;

    if (!NARAMARKET_API_KEY) {
      throw new Error("NARA_API_KEY not configured");
    }

    const lookbackDays = parseBoundedInt(request.nextUrl.searchParams.get("lookbackDays"), 7, 1, 30);
    const maxPages = parseBoundedInt(request.nextUrl.searchParams.get("maxPages"), 10, 1, 10);
    const maxItems = parseBoundedInt(request.nextUrl.searchParams.get("maxItems"), 1000, 1, 1000);

    // 최근 N일간 개찰된 공고 조회 (나라장터 API 호출)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - lookbackDays);
    const startDate = targetDate.toISOString().split("T")[0].replace(/-/g, "") + "0000";
    const endDate = new Date().toISOString().split("T")[0].replace(/-/g, "") + "2359";

    const PAGE_SIZE = 100;

    /**
     * 나라장터 API 전체 페이지 수집 헬퍼
     * serviceKey를 searchParams.set()으로 전달하면 이미 인코딩된 키가 이중 인코딩될 수 있으므로
     * 문자열 직접 결합 방식 사용 (data.go.kr 키 권장 패턴)
     */
    async function fetchAllPages(baseRawUrl: string): Promise<NaramarketBidResult[]> {
      const results: NaramarketBidResult[] = [];
      for (let page = 1; page <= maxPages; page++) {
        const res = await fetch(`${baseRawUrl}&pageNo=${page}`);
        const json = await res.json();
        const body = json?.response?.body;
        // body.items may be an array directly OR wrapped as { item: [...] }
        const rawItems = Array.isArray(body?.items)
          ? body?.items
          : body?.items?.item;
        if (!rawItems) break;
        const items: NaramarketBidResult[] = Array.isArray(rawItems) ? rawItems : [rawItems];
        results.push(...items);
        if (results.length >= maxItems) {
          return results.slice(0, maxItems);
        }
        // 마지막 페이지면 종료
        const totalCount: number = body?.totalCount ?? 0;
        if (results.length >= totalCount || items.length < PAGE_SIZE) break;
      }
      return results;
    }

    // 낙찰결과 API 수집 (1회 fetch 후 개찰결과·낙찰정보 양쪽 처리)
    const awardRawUrl =
      `https://apis.data.go.kr/1230000/as/ScsbidInfoService/getScsbidListSttusServc` +
      `?serviceKey=${NARAMARKET_API_KEY}&numOfRows=${PAGE_SIZE}&inqryDiv=1` +
      `&inqryBgnDt=${startDate}&inqryEndDt=${endDate}&type=json`;

    const openItems = await fetchAllPages(awardRawUrl);
    const awardItems = openItems; // 같은 데이터를 개찰결과·낙찰정보 양쪽 파이프라인으로 처리

    let processedCount = 0;
    let errorCount = 0;

    // 3) 개찰결과 데이터 처리
    for (const item of openItems) {
      try {
        await processOpenResult(supabase, item);
        processedCount++;
      } catch (error) {
        console.error("개찰결과 처리 실패:", item.bidNtceNo, error);
        errorCount++;
      }
    }

    // 4) 낙찰정보 데이터 처리
    for (const item of awardItems) {
      try {
        await processAwardResult(supabase, item);
        processedCount++;
      } catch (error) {
        console.error("낙찰정보 처리 실패:", item.bidNtceNo, error);
        errorCount++;
      }
    }

    // 5) bid_price_features는 DB 트리거(trg_bid_awards_compute_features)가 자동 계산

    await finishCollectionJob(supabase, logId, processedCount);

    return successResponse({
      success: true,
      message: "낙찰 데이터 수집 완료",
      processed: processedCount,
      errors: errorCount,
      lookbackDays,
      maxPages,
      maxItems,
      date_range: { start: startDate, end: endDate },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[collect-bid-awards] Error:", error);

    await failCollectionJob(supabase, logId, message);

    return internalErrorResponse(message);
  }
}

/**
 * 개찰결과 처리
 */
async function processOpenResult(supabase: SupabaseClient, item: NaramarketBidResult) {
  const sourceBidNoticeId = `${item.bidNtceNo}-${item.bidNtceOrd || "00"}`;

  // bid_notices 먼저 upsert
  const { data: bidNotice, error: noticeError } = await supabase
    .from("bid_notices")
    .upsert(
      {
        source_bid_notice_id: sourceBidNoticeId,
        notice_number: item.bidNtceNo,
        notice_name: item.bidNtceNm || "",
        demand_organization: item.dminsttNm,
        contract_type: item.cntrctCnclsMthdNm,
        estimated_price: item.presmptPrce,
        open_datetime: item.rlOpengDt ? parseNaraDate(item.rlOpengDt) : null,
        raw_json: item,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_bid_notice_id" }
    )
    .select()
    .single();

  if (noticeError) throw noticeError;

  // bid_open_results upsert
  const { error: openError } = await supabase
    .from("bid_open_results")
    .upsert(
      {
        bid_notice_id: bidNotice.id,
        opened_at: item.rlOpengDt ? parseNaraDate(item.rlOpengDt) : new Date().toISOString(),
        total_bidders: item.prtcptCnum || 0,
        valid_bidders: item.prtcptCnum || 0,
        is_successful: true,
        raw_json: item,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bid_notice_id" }
    );

  if (openError) throw openError;
}

/**
 * 낙찰정보 처리
 * bid_awards(bid_notices 연결) + awards(tenders 연결) 양쪽 모두 저장
 */
async function processAwardResult(supabase: SupabaseClient, item: NaramarketBidResult) {
  const sourceBidNoticeId = `${item.bidNtceNo}-${item.bidNtceOrd || "00"}`;
  const participantCount = item.prtcptCnum ? Number(item.prtcptCnum) : null;
  const awardedAt = item.rlOpengDt ? parseNaraDate(item.rlOpengDt) : new Date().toISOString();

  // bid_notices 먼저 확인/생성
  const { data: bidNotice, error: noticeError } = await supabase
    .from("bid_notices")
    .upsert(
      {
        source_bid_notice_id: sourceBidNoticeId,
        notice_number: item.bidNtceNo,
        notice_name: item.bidNtceNm || "",
        demand_organization: item.dminsttNm,
        estimated_price: item.presmptPrce,
        raw_json: item,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_bid_notice_id" }
    )
    .select()
    .single();

  if (noticeError) throw noticeError;

  // bid_awards upsert (bid_notices 연결)
  const { error: awardError } = await supabase.from("bid_awards").upsert(
    {
      bid_notice_id: bidNotice.id,
      winner_company_name: item.bidwinnrNm,
      winner_business_number: item.bidwinnrBizno,
      winner_bid_rate: item.sucsfbidRate,
      winner_bid_amount: item.sucsfbidAmt,
      contract_amount: item.sucsfbidAmt,
      awarded_at: awardedAt,
      is_final: true,
      raw_json: item,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "bid_notice_id" }
  );

  if (awardError) throw awardError;

  // awards 테이블도 동기화 (tenders 연결, get_ai_insights_v2에서 사용)
  // source_tender_id로 tenders 찾기 (공고번호 기반 매칭)
  const { data: tender } = await supabase
    .from("tenders")
    .select("id")
    .or(`source_tender_id.eq.${item.bidNtceNo},source_tender_id.eq.${sourceBidNoticeId}`)
    .maybeSingle();

  if (tender?.id && item.sucsfbidRate) {
    await supabase.from("awards").upsert(
      {
        tender_id: tender.id,
        winner_company_name: item.bidwinnrNm || null,
        bidder_registration_no: item.bidwinnrBizno || null,
        bidder_company_name: item.bidwinnrNm || null,
        awarded_amount: item.sucsfbidAmt ? Number(item.sucsfbidAmt) : null,
        awarded_rate: item.sucsfbidRate ? Number(item.sucsfbidRate) : null,
        opened_at: awardedAt,
        // Migration 026에서 추가된 컬럼
        participant_count: participantCount,
        reserve_price: null,
        bid_notice_no: item.bidNtceNo,
        bid_notice_ord: item.bidNtceOrd || "00",
        result_status: "awarded",
        sequence_no: 1,
        raw_json: item,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "tender_id,bidder_registration_no,sequence_no",
        ignoreDuplicates: false,
      }
    );
  }

  // bid_participants에도 낙찰자(rank=1) 저장
  if (item.bidwinnrNm && item.bidNtceNo) {
    await supabase.from("bid_participants").upsert(
      {
        tender_id: tender?.id ?? null,
        notice_no: item.bidNtceNo,
        notice_ord: item.bidNtceOrd || "00",
        company_name: item.bidwinnrNm,
        bid_rank: 1,
        bid_amount: item.sucsfbidAmt ? Number(item.sucsfbidAmt) : null,
        bid_rate: item.sucsfbidRate ? Number(item.sucsfbidRate) : null,
        is_winner: true,
        raw_json: item,
      },
      { onConflict: "notice_no,notice_ord,company_name,bid_rank", ignoreDuplicates: true }
    );
  }
}

