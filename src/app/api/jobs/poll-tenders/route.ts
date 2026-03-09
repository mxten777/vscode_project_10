import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret, retryWithBackoff } from "@/lib/helpers";
import { errorResponse, successResponse, internalErrorResponse } from "@/lib/api-response";

// 나라장터 API는 한국 IP만 허용 → 서울 리전에서 실행
export const preferredRegion = "icn1";

const NARA_API_BASE = process.env.NARA_API_BASE_URL || "https://apis.data.go.kr/1230000";
const NARA_API_KEY = (process.env.NARA_API_KEY || "").trim(); // trim(): Vercel env 줄바꿈 방지
// 운영계정 endpoint (개발계정과 다름)
const NARA_API_ENDPOINT = `${NARA_API_BASE}/ad/BidPublicInfoService/getBidPblancListInfoServc`;

/**
 * GET /api/jobs/poll-tenders (임시 디버그)
 */
export async function GET() {
  const keyLen = NARA_API_KEY.length;
  const url = `${NARA_API_ENDPOINT}?serviceKey=${NARA_API_KEY}&pageNo=1&numOfRows=3&type=json&inqryDiv=1&inqryBgnDt=${getRecentDateStr()}&inqryEndDt=${getTodayStr()}`;
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.text();
  return successResponse({ keyLen, endpoint: NARA_API_ENDPOINT, httpStatus: res.status, dates: { from: getRecentDateStr(), to: getTodayStr() }, body: body.substring(0, 300) });
}

/**
 * POST /api/jobs/poll-tenders
 * Vercel Cron에서 호출 — 나라장터 API로 신규 공고 수집
 */

export async function POST(request: NextRequest) {
  // 시크릿 키 검증
  if (!verifyCronSecret(request)) {
    return errorResponse("UNAUTHORIZED", "잘못된 인증 키", 401);
  }

  const supabase = createServiceClient();
  const results = { inserted: 0, updated: 0, errors: 0 };

  try {
    // 나라장터 API 호출 (재시도 포함)
    // 주의: NARA_API_KEY는 .env.local에 이미 URL 인코딩된 상태로 저장됨
    // searchParams.set()은 자동으로 인코딩하므로 이중 인코딩 방지를 위해
    // 디코딩 후 set() 하거나, 직접 문자열로 붙임
    const rawItems = await retryWithBackoff(async () => {
      // 운영계정 키는 plain hex — URL 인코딩 없이 직접 사용
      const url = `${NARA_API_ENDPOINT}?serviceKey=${NARA_API_KEY}&pageNo=1&numOfRows=100&type=json&inqryDiv=1&inqryBgnDt=${getRecentDateStr()}&inqryEndDt=${getTodayStr()}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`나라장터 API 오류: ${res.status}`);

      const json = await res.json();
      // 실제 응답 구조에 따라 파싱 경로 조정 필요
      const items =
        json?.response?.body?.items ?? json?.items ?? json?.data ?? [];
      return Array.isArray(items) ? items : [];
    }, 3);

    // ─── 1단계: 기관 배치 upsert (1회 쿼리) ───────────────────
    const agencyMap = new Map<string, string>(); // code → id

    const uniqueAgencies = [
      ...new Map(
        rawItems
          .map((item) => {
            const code = (item.dminsttCd || item.ntceInsttCd || "") as string;
            const name = (item.dminsttNm || item.ntceInsttNm || "알수없음") as string;
            return [code, { code, name }] as [string, { code: string; name: string }];
          })
          .filter(([code]) => !!code)
      ).values(),
    ];

    if (uniqueAgencies.length) {
      const { data: agencies } = await supabase
        .from("agencies")
        .upsert(uniqueAgencies, { onConflict: "code" })
        .select("id, code");
      agencies?.forEach((a: { id: string; code: string }) => agencyMap.set(a.code, a.id));
    }

    // ─── 2단계: 공고 배치 upsert (1회 쿼리) ───────────────────
    const tenderPayloads = rawItems
      .map((item) => {
        const sourceTenderId = extractSourceId(item);
        if (!sourceTenderId) return null;
        const agencyCode = (item.dminsttCd || item.ntceInsttCd || "") as string;
        return {
          source_tender_id: sourceTenderId,
          title: (item.bidNtceNm || item.prdctClsfcNoNm || "제목 없음") as string,
          agency_id: agencyMap.get(agencyCode) ?? null,
          demand_agency_name: (item.dminsttNm as string) || null,
          budget_amount: parseFloat(item.presmptPrce as string) || null,
          region_code: (item.bidNtceAreaCd as string) || null,
          region_name: (item.bidNtceAreaNm as string) || null,
          industry_code: (item.prdctClsfcNo as string) || null,
          industry_name: (item.prdctClsfcNoNm as string) || null,
          method_type: (item.cntrctMthdCd as string) || null,
          published_at: parseDate((item.bidNtceDt || item.rgstDt) as string),
          deadline_at: parseDate(item.bidClseDt as string),
          status: determineTenderStatus(item),
          raw_json: item,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (tenderPayloads.length) {
      const { data: upserted, error: upsertErr } = await supabase
        .from("tenders")
        .upsert(tenderPayloads, { onConflict: "source_tender_id" })
        .select("id");

      if (upsertErr) throw upsertErr;
      results.inserted = upserted?.length ?? 0;
    }

    return successResponse({
      message: "수집 완료",
      totalFetched: rawItems.length,
      ...results,
    });
  } catch (err) {
    console.error("poll-tenders 전체 오류:", err);
    return internalErrorResponse();
  }
}

// ─── 유틸 ──────────────────────────────────────────────

function extractSourceId(item: Record<string, unknown>): string | null {
  return (
    (item.bidNtceNo as string) ||
    (item.bfSpecRgstNo as string) ||
    (item.bidNtceOrd as string) ||
    null
  );
}

function determineTenderStatus(item: Record<string, unknown>): string {
  const closeDate = item.bidClseDt as string | undefined;
  if (closeDate) {
    const d = new Date(closeDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
    if (d < new Date()) return "CLOSED";
  }
  return "OPEN";
}

function parseDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  // 나라장터는 "20240101" 또는 "2024-01-01 12:00" 등 다양한 형식
  const cleaned = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function getTodayStr(): string {
  // 운영계정 날짜 형식: YYYYMMDDHHMM (12자리)
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}2359`;
}

function getRecentDateStr(): string {
  // 운영계정 날짜 형식: YYYYMMDDHHMM (12자리)
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}0000`;
}
