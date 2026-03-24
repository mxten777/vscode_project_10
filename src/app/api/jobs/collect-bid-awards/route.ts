/**
 * 낙찰 데이터 수집 Job
 * 
 * 나라장터 API:
 * - 개찰결과 API: /getBidPblancListInfoThngCnstwk (개찰정보조회)
 * - 낙찰정보 API: /getBidPblancListInfoPSSrch (낙찰정보조회)
 * 
 * Schedule: Vercel Cron (평일 09:10 UTC = 18:10 KST)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// 나라장터 API 타입
interface NaramarketBidResult {
  bidNtceNo: string; // 입찰공고번호
  bidNtceOrd: string; // 입찰공고차수
  dminsttNm: string; // 수요기관명
  rbidNo: string; // 재입찰번호
  
  // 개찰 결과
  opengDt: string; // 개찰일시
  prtcptCnum: number; // 참가업체수
  
  // 낙찰 결과
  bsnmNm: string; // 낙찰업체명
  bsnmRgstNo: string; // 사업자등록번호
  scsbidAmt: number; // 낙찰금액
  scsbidRate: number; // 낙찰률
  presmptPrce: number; // 예정가격
  
  // 기타
  cntrctCnclsMthdNm: string; // 계약체결방법명
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    // Cron secret 검증
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const NARAMARKET_API_KEY = process.env.NARA_API_KEY;

    if (!NARAMARKET_API_KEY) {
      throw new Error("NARA_API_KEY not configured");
    }

    // 최근 7일간 개찰된 공고 조회 (나라장터 API 호출)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 7);
    const startDate = targetDate.toISOString().split("T")[0].replace(/-/g, "");
    const endDate = new Date().toISOString().split("T")[0].replace(/-/g, "");

    // 1) 개찰결과 API 호출
    const openResultsUrl = new URL(
      "https://apis.data.go.kr/1230000/BidPublicInfoService04/getBidPblancListInfoThngCnstwk"
    );
    openResultsUrl.searchParams.set("serviceKey", NARAMARKET_API_KEY);
    openResultsUrl.searchParams.set("numOfRows", "100");
    openResultsUrl.searchParams.set("pageNo", "1");
    openResultsUrl.searchParams.set("inqryDiv", "1"); // 조회구분 (1: 개찰일자)
    openResultsUrl.searchParams.set("inqryBgnDt", startDate);
    openResultsUrl.searchParams.set("inqryEndDt", endDate);
    openResultsUrl.searchParams.set("type", "json");

    const openResponse = await fetch(openResultsUrl.toString());
    const openData = await openResponse.json();

    // 2) 낙찰정보 API 호출
    const awardUrl = new URL(
      "https://apis.data.go.kr/1230000/ScsbidInfoService04/getScsbidList04"
    );
    awardUrl.searchParams.set("serviceKey", NARAMARKET_API_KEY);
    awardUrl.searchParams.set("numOfRows", "100");
    awardUrl.searchParams.set("pageNo", "1");
    awardUrl.searchParams.set("inqryDiv", "1");
    awardUrl.searchParams.set("inqryBgnDt", startDate);
    awardUrl.searchParams.set("inqryEndDt", endDate);
    awardUrl.searchParams.set("type", "json");

    const awardResponse = await fetch(awardUrl.toString());
    const awardData = await awardResponse.json();

    let processedCount = 0;
    let errorCount = 0;

    // 3) 개찰결과 데이터 처리
    const openItems = openData?.response?.body?.items?.item || [];
    for (const item of Array.isArray(openItems) ? openItems : [openItems]) {
      try {
        await processOpenResult(supabase, item);
        processedCount++;
      } catch (error) {
        console.error("개찰결과 처리 실패:", item.bidNtceNo, error);
        errorCount++;
      }
    }

    // 4) 낙찰정보 데이터 처리
    const awardItems = awardData?.response?.body?.items?.item || [];
    for (const item of Array.isArray(awardItems) ? awardItems : [awardItems]) {
      try {
        await processAwardResult(supabase, item);
        processedCount++;
      } catch (error) {
        console.error("낙찰정보 처리 실패:", item.bidNtceNo, error);
        errorCount++;
      }
    }

    // 5) bid_price_features는 DB 트리거(trg_bid_awards_compute_features)가 자동 계산

    return NextResponse.json({
      success: true,
      message: "낙찰 데이터 수집 완료",
      processed: processedCount,
      errors: errorCount,
      date_range: { start: startDate, end: endDate },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[collect-bid-awards] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
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
        open_datetime: item.opengDt ? parseNaramarketDate(item.opengDt) : null,
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
        opened_at: item.opengDt ? parseNaramarketDate(item.opengDt) : new Date().toISOString(),
        total_bidders: item.prtcptCnum || 0,
        valid_bidders: item.prtcptCnum || 0, // API에 따라 조정 필요
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
 */
async function processAwardResult(supabase: SupabaseClient, item: NaramarketBidResult) {
  const sourceBidNoticeId = `${item.bidNtceNo}-${item.bidNtceOrd || "00"}`;

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

  // bid_awards upsert
  const { error: awardError } = await supabase.from("bid_awards").upsert(
    {
      bid_notice_id: bidNotice.id,
      winner_company_name: item.bsnmNm,
      winner_business_number: item.bsnmRgstNo,
      winner_bid_rate: item.scsbidRate,
      winner_bid_amount: item.scsbidAmt,
      contract_amount: item.scsbidAmt, // 낙찰금액과 동일한 경우가 많음
      awarded_at: item.opengDt ? parseNaramarketDate(item.opengDt) : new Date().toISOString(),
      is_final: true,
      raw_json: item,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "bid_notice_id" }
  );

  if (awardError) throw awardError;
}

/**
 * 나라장터 날짜 파싱 (YYYYMMDD 또는 YYYYMMDDHHmmss)
 */
function parseNaramarketDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  const cleaned = dateStr.replace(/[^0-9]/g, "");

  if (cleaned.length === 8) {
    // YYYYMMDD
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
  } else if (cleaned.length === 14) {
    // YYYYMMDDHHmmss
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    const hour = cleaned.substring(8, 10);
    const minute = cleaned.substring(10, 12);
    const second = cleaned.substring(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
  }

  return new Date().toISOString();
}