import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret, retryWithBackoff } from "@/lib/helpers";
import { errorResponse, successResponse, internalErrorResponse } from "@/lib/api-response";

// 나라장터 API는 한국 IP만 허용 → 서울 리전에서 실행
export const preferredRegion = "icn1";

// Vercel Cron은 GET으로 호출 → POST 핸들러로 위임
export async function GET(request: NextRequest) {
  return POST(request);
}

const NARA_API_BASE = process.env.NARA_API_BASE_URL || "https://apis.data.go.kr/1230000";
const NARA_API_KEY = (process.env.NARA_API_KEY || "").trim(); // trim(): Vercel env 줄바꿈 방지
// 운영계정 endpoint (개발계정과 다름)
const NARA_API_ENDPOINT = `${NARA_API_BASE}/ad/BidPublicInfoService/getBidPblancListInfoServc`;

/**
 * POST /api/jobs/poll-tenders
 * Vercel Cron에서 호출 — 나라장터 API로 신규 공고 수집 (페이지네이션 루프)
 */

export async function POST(request: NextRequest) {
  // 시크릿 키 검증
  if (!verifyCronSecret(request)) {
    return errorResponse("UNAUTHORIZED", "잘못된 인증 키", 401);
  }

  const supabase = createServiceClient();
  const results = { inserted: 0, errors: 0, totalFetched: 0 };

  // ── 수집 이력: 시작 기록 ──────────────────────────────────────
  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ job_type: "tenders", status: "running" })
    .select("id")
    .single();
  const logId: string | null = logEntry?.id ?? null;

  try {
    let pageNo = 1;
    let totalCount = 0;
    const MAX_PAGES = 50; // 안전 상한선 (5,000건)

    // ── 페이지네이션 루프 ────────────────────────────────────────
    do {
      const { items, total } = await retryWithBackoff(async () => {
        const url = buildApiUrl(pageNo);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`나라장터 API 오류: ${res.status}`);

        const json = await res.json();
        const items = json?.response?.body?.items ?? json?.items ?? json?.data ?? [];
        const total = parseInt(json?.response?.body?.totalCount ?? "0", 10);
        return { items: Array.isArray(items) ? items : [], total };
      }, 3);

      totalCount = total;
      results.totalFetched += items.length;

      if (items.length === 0) break;

      // ─── 기관 배치 upsert ──────────────────────────────────────
      const agencyMap = new Map<string, string>();
      const uniqueAgencies = [
        ...new Map(
          items
            .map((item: Record<string, unknown>) => {
              const code = (item.dminsttCd || item.ntceInsttCd || "") as string;
              const name = (item.dminsttNm || item.ntceInsttNm || "알수없음") as string;
              return [code, { code, name }] as [string, { code: string; name: string }];
            })
            .filter(([code]: [string, unknown]) => !!code)
        ).values(),
      ];

      if (uniqueAgencies.length) {
        const { data: agencies } = await supabase
          .from("agencies")
          .upsert(uniqueAgencies, { onConflict: "code" })
          .select("id, code");
        agencies?.forEach((a: { id: string; code: string }) => agencyMap.set(a.code, a.id));
      }

      // ─── 공고 배치 upsert ──────────────────────────────────────
      const tenderPayloads = items
        .map((item: Record<string, unknown>) => {
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
            published_at: latestDateIso(
              parseDate(item.bidNtceDt as string),
              parseDate(item.rgstDt as string)
            ),
            deadline_at: parseDate(item.bidClseDt as string),
            status: determineTenderStatus(item),
            raw_json: item,
          };
        })
        .filter((p: unknown): p is NonNullable<typeof p> => p !== null);

      const uniqueTenderPayloads = [
        ...new Map(
          (tenderPayloads as Array<{ source_tender_id: string }>).map((p) => [p.source_tender_id, p])
        ).values(),
      ];

      if (uniqueTenderPayloads.length) {
        const { data: upserted, error: upsertErr } = await supabase
          .from("tenders")
          .upsert(uniqueTenderPayloads, { onConflict: "source_tender_id" })
          .select("id");
        if (upsertErr) throw upsertErr;
        results.inserted += upserted?.length ?? 0;
      }

      // 진행 상태 업데이트 (페이지마다 체크포인트 저장)
      if (logId) {
        await supabase
          .from("collection_logs")
          .update({
            last_page_no: pageNo,
            records_collected: results.inserted,
            total_pages: Math.ceil(totalCount / 100),
          })
          .eq("id", logId);
      }

      pageNo++;
    } while (results.totalFetched < totalCount && pageNo <= MAX_PAGES);

    // ── 수집 이력: 완료 기록 ─────────────────────────────────────
    if (logId) {
      await supabase
        .from("collection_logs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          records_collected: results.inserted,
          total_pages: Math.ceil(totalCount / 100),
        })
        .eq("id", logId);
    }

    // ── 만료 공고 CLOSED 갱신 ─────────────────────────────────────
    // 7일 이전 수집 공고 중 deadline_at이 지난 것을 OPEN → CLOSED로 일괄 갱신
    const { data: closedResult } = await supabase.rpc("close_expired_tenders");
    const closedCount = (closedResult as { closed_count?: number }[] | null)?.[0]?.closed_count ?? 0;

    return successResponse({
      message: "수집 완료",
      totalFetched: results.totalFetched,
      totalCount,
      pagesProcessed: pageNo - 1,
      inserted: results.inserted,
      expiredClosed: closedCount,
    });
  } catch (err) {
    // ── 수집 이력: 실패 기록 ─────────────────────────────────────
    if (logId) {
      await supabase
        .from("collection_logs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: String(err),
        })
        .eq("id", logId);
    }
    console.error("poll-tenders 전체 오류:", err);
    return internalErrorResponse();
  }
}

// ─── 유틸 ──────────────────────────────────────────────

function buildApiUrl(pageNo: number): string {
  const params = new URLSearchParams({
    serviceKey: NARA_API_KEY,
    pageNo: String(pageNo),
    numOfRows: "100",
    type: "json",
    inqryDiv: "1",
    inqryBgnDt: getRecentDateStr(),
    inqryEndDt: getTodayStr(),
  });
  return `${NARA_API_ENDPOINT}?${params.toString()}`;
}

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
  const s = dateStr.trim();
  // YYYYMMDDHHMM (12자리, 나라장터 표준 형식) → KST(+09:00) 기준 ISO 변환
  if (/^\d{12}$/.test(s)) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:00+09:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // YYYYMMDD (8자리)
  if (/^\d{8}$/.test(s)) {
    const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // 기타 형식 ("2026-03-03 09:40:03" 등) — 나라장터는 KST 기준, +09:00 명시
  const d = new Date(s.replace(" ", "T") + "+09:00");
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function latestDateIso(a?: string | null, b?: string | null): string | null {
  if (!a && !b) return null;
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (isNaN(ta) && isNaN(tb)) return null;
  if (isNaN(ta)) return new Date(tb).toISOString();
  if (isNaN(tb)) return new Date(ta).toISOString();
  return ta >= tb ? new Date(ta).toISOString() : new Date(tb).toISOString();
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
