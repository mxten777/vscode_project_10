import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret, retryWithBackoff } from "@/lib/helpers";
import { errorResponse, successResponse, internalErrorResponse } from "@/lib/api-response";

const NARA_API_BASE = process.env.NARA_API_BASE_URL || "https://apis.data.go.kr/1230000";
const NARA_API_KEY = process.env.NARA_API_KEY || "";

/**
 * POST /api/jobs/poll-tenders
 * Vercel Cron에서 호출 — 나라장터 API로 신규 공고 수집
 *
 * 가정:
 * - 나라장터 입찰공고목록 API: /getBidPblancListInfoServc/getBidPblancListInfoServc01
 * - 응답 형식은 JSON (serviceKey, pageNo, numOfRows 파라미터 사용)
 * - 실제 API 스펙이 달라질 수 있으므로, 핵심은 upsert 로직임
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
    const rawItems = await retryWithBackoff(async () => {
      const url = new URL(
        `${NARA_API_BASE}/getBidPblancListInfoServc/getBidPblancListInfoServc01`
      );
      url.searchParams.set("serviceKey", NARA_API_KEY);
      url.searchParams.set("pageNo", "1");
      url.searchParams.set("numOfRows", "100");
      url.searchParams.set("type", "json");
      url.searchParams.set("inqryDiv", "1"); // 최신순
      url.searchParams.set("inqryBgnDt", getRecentDateStr());
      url.searchParams.set("inqryEndDt", getTodayStr());

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`나라장터 API 오류: ${res.status}`);

      const json = await res.json();
      // 실제 응답 구조에 따라 파싱 경로 조정 필요
      const items =
        json?.response?.body?.items ?? json?.items ?? json?.data ?? [];
      return Array.isArray(items) ? items : [];
    }, 3);

    // 각 공고를 upsert
    for (const item of rawItems) {
      try {
        const sourceTenderId = extractSourceId(item);
        if (!sourceTenderId) continue;

        // 기관 upsert
        const agencyCode = item.dminsttCd || item.ntceInsttCd || "";
        const agencyName = item.dminsttNm || item.ntceInsttNm || "알수없음";
        let agencyId: string | null = null;

        if (agencyCode) {
          const { data: agency } = await supabase
            .from("agencies")
            .upsert(
              { code: agencyCode, name: agencyName, raw_json: item },
              { onConflict: "code" }
            )
            .select("id")
            .single();
          agencyId = agency?.id ?? null;
        }

        // 공고 upsert
        const tenderPayload = {
          source_tender_id: sourceTenderId,
          title: item.bidNtceNm || item.prdctClsfcNoNm || "제목 없음",
          agency_id: agencyId,
          demand_agency_name: item.dminsttNm || null,
          budget_amount: parseFloat(item.presmptPrce) || null,
          region_code: item.bidNtceAreaCd || null,
          region_name: item.bidNtceAreaNm || null,
          industry_code: item.prdctClsfcNo || null,
          industry_name: item.prdctClsfcNoNm || null,
          method_type: item.cntrctMthdCd || null,
          published_at: parseDate(item.bidNtceDt || item.rgstDt),
          deadline_at: parseDate(item.bidClseDt),
          status: determineTenderStatus(item),
          raw_json: item,
        };

        const { data: existing } = await supabase
          .from("tenders")
          .select("id")
          .eq("source_tender_id", sourceTenderId)
          .maybeSingle();

        if (existing) {
          await supabase.from("tenders").update(tenderPayload).eq("id", existing.id);
          results.updated++;
        } else {
          await supabase.from("tenders").insert(tenderPayload);
          results.inserted++;
        }
      } catch (itemErr) {
        console.error("공고 처리 오류:", itemErr);
        results.errors++;
      }
    }

    return successResponse({
      message: "수집 완료",
      totalFetched: rawItems.length,
      ...results,
    });
  } catch (err) {
    console.error("poll-tenders 전체 오류:", err);

    // 실패 로그 기록 (간단)
    try {
      await supabase.from("alert_logs").insert({
        alert_rule_id: null as unknown as string,
        tender_id: null as unknown as string,
        status: "FAIL",
        error_message: `poll-tenders 실패: ${String(err)}`,
      });
    } catch { /* ignore log failure */ }

    return internalErrorResponse(`수집 실패: ${String(err)}`);
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
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function getRecentDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
