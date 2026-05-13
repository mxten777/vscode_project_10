import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret, retryWithBackoff } from "@/lib/helpers";
import { errorResponse, successResponse, internalErrorResponse } from "@/lib/api-response";
import { failCollectionJob, finishCollectionJob, startCollectionJob, updateCollectionJob } from "@/lib/collection-logs";
import { getErrorMessage, parseBoundedInt } from "@/lib/job-utils";

// 나라장터 API는 한국 IP만 허용 → 서울 리전에서 실행
export const preferredRegion = "icn1";

// Vercel Cron은 GET으로 호출 → POST 핸들러로 위임
export async function GET(request: NextRequest) {
  return POST(request);
}

const NARA_API_BASE = process.env.NARA_API_BASE_URL || "https://apis.data.go.kr/1230000";
const NARA_API_KEY = (process.env.NARA_API_KEY || "").trim(); // trim(): Vercel env 줄바꿈 방지

// 나라장터 4개 업종별 엔드포인트 — 엔드포인트 자체가 업종 분류 기준
const NARA_ENDPOINTS = [
  { path: "getBidPblancListInfoServc",  industryCode: "SVC",  industryName: "용역" },
  { path: "getBidPblancListInfoCnstwk", industryCode: "CON",  industryName: "공사" },
  { path: "getBidPblancListInfoThng",   industryCode: "GDS",  industryName: "물품" },
  { path: "getBidPblancListInfoFrgcpt", industryCode: "FOR",  industryName: "외자" },
] as const;

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
  const maxPages = parseBoundedInt(request.nextUrl.searchParams.get("maxPages"), 50, 1, 200);
  const lookbackDays = parseBoundedInt(request.nextUrl.searchParams.get("lookbackDays"), 7, 1, 365);
  // 직접 날짜 범위 지정 (소급 수집용): ?startDate=202602010000&endDate=202604300000
  const startDateParam = request.nextUrl.searchParams.get("startDate") ?? null;
  const endDateParam   = request.nextUrl.searchParams.get("endDate")   ?? null;

  // ── 수집 이력: 시작 기록 ──────────────────────────────────────
  const logId = await startCollectionJob(supabase, "tenders");

  try {
    // ── 4개 업종 엔드포인트 순차 수집 ────────────────────────────
    for (const endpoint of NARA_ENDPOINTS) {
      let pageNo = 1;
      let totalCount = 0;

      do {
        const { items, total } = await retryWithBackoff(async () => {
          const url = buildApiUrl(pageNo, lookbackDays, endpoint.path, startDateParam, endDateParam);
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`나라장터 API 오류 [${endpoint.path}]: ${res.status}`);

          const json = await res.json();
          const items = json?.response?.body?.items ?? json?.items ?? json?.data ?? [];
          const total = parseInt(json?.response?.body?.totalCount ?? "0", 10);
          return { items: Array.isArray(items) ? items : [], total };
        }, 3);

        totalCount = total;
        results.totalFetched += items.length;

        if (items.length === 0) break;

        // ─── 기관 배치 upsert ────────────────────────────────────
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

        // ─── 공고 배치 upsert ────────────────────────────────────
        const tenderPayloads = items
          .map((item: Record<string, unknown>) => {
            const sourceTenderId = extractSourceId(item);
            if (!sourceTenderId) return null;
            const agencyCode = (item.dminsttCd || item.ntceInsttCd || "") as string;

            // 지역: API 제공값 우선, 없으면 기관명에서 추출
            const regionFromApi = (item.bidNtceAreaCd as string) || null;
            const regionNameFromApi = (item.bidNtceAreaNm as string) || null;
            const derivedRegion = regionFromApi
              ? null
              : deriveRegion((item.dminsttNm || item.ntceInsttNm || "") as string);

            return {
              source_tender_id: sourceTenderId,
              title: (item.bidNtceNm || item.prdctClsfcNoNm || "제목 없음") as string,
              agency_id: agencyMap.get(agencyCode) ?? null,
              demand_agency_name: (item.dminsttNm as string) || null,
              budget_amount: parseFloat(item.presmptPrce as string) || null,
              // 지역: API값 → 기관명 파싱 순
              region_code: regionFromApi ?? derivedRegion?.code ?? null,
              region_name: regionNameFromApi ?? derivedRegion?.name ?? null,
              // 업종: 엔드포인트 타입으로 확정 (API는 세부 품목코드만 제공)
              industry_code: endpoint.industryCode,
              industry_name: endpoint.industryName,
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

        // 진행 상태 업데이트
        await updateCollectionJob(supabase, logId, {
          last_page_no: pageNo,
          records_collected: results.inserted,
          total_pages: Math.ceil(totalCount / 100),
        });

        pageNo++;
      } while (results.totalFetched < totalCount && pageNo <= maxPages);
    }

    // ── 수집 이력: 완료 기록 ─────────────────────────────────────
    await finishCollectionJob(supabase, logId, results.inserted, {});

    // ── 만료 공고 CLOSED 갱신 ─────────────────────────────────────
    const { data: closedResult } = await supabase.rpc("close_expired_tenders");
    const closedCount = (closedResult as { closed_count?: number }[] | null)?.[0]?.closed_count ?? 0;

    return successResponse({
      message: "수집 완료",
      totalFetched: results.totalFetched,
      inserted: results.inserted,
      maxPages,
      lookbackDays,
      expiredClosed: closedCount,
    });
  } catch (err) {
    const message = getErrorMessage(err, "서버 오류가 발생했습니다");
    // ── 수집 이력: 실패 기록 ─────────────────────────────────────
    await failCollectionJob(supabase, logId, message);
    console.error("poll-tenders 전체 오류:", err);
    return internalErrorResponse(message);
  }
}

// ─── 유틸 ──────────────────────────────────────────────

function buildApiUrl(
  pageNo: number,
  lookbackDays: number,
  endpointPath: string,
  startDate?: string | null,
  endDate?: string | null
): string {
  const params = new URLSearchParams({
    serviceKey: NARA_API_KEY,
    pageNo: String(pageNo),
    numOfRows: "100",
    type: "json",
    inqryDiv: "1",
    inqryBgnDt: startDate ?? getRecentDateStr(lookbackDays),
    inqryEndDt: endDate   ?? getTodayStr(),
  });
  return `${NARA_API_BASE}/ad/BidPublicInfoService/${endpointPath}?${params.toString()}`;
}

// 기관명에서 광역시도 추출 — API가 지역코드를 제공하지 않는 엔드포인트 보완용
const REGION_KEYWORDS: Array<{ keywords: string[]; code: string; name: string }> = [
  { keywords: ["서울"],              code: "11", name: "서울" },
  { keywords: ["부산"],              code: "26", name: "부산" },
  { keywords: ["대구"],              code: "27", name: "대구" },
  { keywords: ["인천"],              code: "28", name: "인천" },
  { keywords: ["광주"],              code: "29", name: "광주" },
  { keywords: ["대전"],              code: "30", name: "대전" },
  { keywords: ["울산"],              code: "31", name: "울산" },
  { keywords: ["세종"],              code: "36", name: "세종" },
  { keywords: ["경기"],              code: "41", name: "경기" },
  { keywords: ["강원"],              code: "42", name: "강원" },
  { keywords: ["충북", "충청북도"],  code: "43", name: "충북" },
  { keywords: ["충남", "충청남도"],  code: "44", name: "충남" },
  { keywords: ["전북", "전라북도"],  code: "45", name: "전북" },
  { keywords: ["전남", "전라남도"],  code: "46", name: "전남" },
  { keywords: ["경북", "경상북도"],  code: "47", name: "경북" },
  { keywords: ["경남", "경상남도"],  code: "48", name: "경남" },
  { keywords: ["제주"],              code: "50", name: "제주" },
];

function deriveRegion(agencyName: string): { code: string; name: string } | null {
  if (!agencyName) return null;
  for (const r of REGION_KEYWORDS) {
    if (r.keywords.some((kw) => agencyName.includes(kw))) {
      return { code: r.code, name: r.name };
    }
  }
  return null;
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

function getRecentDateStr(lookbackDays: number): string {
  // 운영계정 날짜 형식: YYYYMMDDHHMM (12자리)
  const d = new Date();
  d.setDate(d.getDate() - lookbackDays);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}0000`;
}
