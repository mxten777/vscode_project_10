import { NextRequest } from "next/server";
import { errorResponse, successResponse, internalErrorResponse } from "@/lib/api-response";
import { parseBoundedInt } from "@/lib/job-utils";
import { retryWithBackoff } from "@/lib/helpers";

// 나라장터 API는 한국 IP만 허용 → vercel.json functions 블록에서 icn1 리전 지정

const NARA_API_BASE = process.env.NARA_API_BASE_URL || "https://apis.data.go.kr/1230000";
const NARA_API_KEY = (process.env.NARA_API_KEY || "").trim();

const NARA_ENDPOINTS = [
  { path: "getBidPblancListInfoServc",  industryCode: "SVC", industryName: "용역" },
  { path: "getBidPblancListInfoCnstwk", industryCode: "CON", industryName: "공사" },
  { path: "getBidPblancListInfoThng",   industryCode: "GDS", industryName: "물품" },
  { path: "getBidPblancListInfoFrgcpt", industryCode: "FOR", industryName: "외자" },
] as const;

/**
 * GET /api/search/nara
 * 나라장터 API 직접 키워드 검색 (온디맨드, DB 저장 없음)
 *
 * Query params:
 *   q          - 검색 키워드 (필수)
 *   startDate  - 조회 시작일 YYYYMMDDHHMM (기본: 3년 전)
 *   endDate    - 조회 종료일 YYYYMMDDHHMM (기본: 오늘)
 *   pageNo     - 페이지 번호 (기본: 1)
 *   industry   - 업종 필터: SVC|CON|GDS|FOR|ALL (기본: ALL)
 *   searchBy   - 검색 방식: title(공고명) | agency(기관명) | both (기본: both)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const keyword = searchParams.get("q")?.trim() ?? "";
  if (!keyword) return errorResponse("BAD_REQUEST", "검색 키워드(q)가 필요합니다", 400);

  const pageNo   = parseBoundedInt(searchParams.get("pageNo"), 1, 1, 100);
  const industry = searchParams.get("industry") ?? "ALL";
  const searchBy = searchParams.get("searchBy") ?? "both"; // title | agency | both
  const startDate = searchParams.get("startDate") ?? getDateStr(4 * 365); // 기본 4년 전
  const endDate   = searchParams.get("endDate")   ?? getTodayStr();

  // 업종 필터 적용
  const endpoints = industry === "ALL"
    ? NARA_ENDPOINTS
    : NARA_ENDPOINTS.filter((e) => e.industryCode === industry);

  if (endpoints.length === 0) {
    return errorResponse("BAD_REQUEST", "유효하지 않은 업종 코드입니다 (SVC|CON|GDS|FOR|ALL)", 400);
  }

  try {
    const allItems: NaraItem[] = [];
    let totalCount = 0;

    // searchBy: title=bidNtceNm, agency=ntceInsttNm, both=두 방식 병행
    const searchModes: Array<{ paramName: string; label: string }> = [];
    if (searchBy === "title")  searchModes.push({ paramName: "bidNtceNm",   label: "공고명" });
    else if (searchBy === "agency") searchModes.push({ paramName: "ntceInsttNm", label: "기관명" });
    else { // both
      searchModes.push({ paramName: "bidNtceNm",   label: "공고명" });
      searchModes.push({ paramName: "ntceInsttNm", label: "기관명" });
    }

    const seenIds = new Set<string>();

    for (const endpoint of endpoints) {
      for (const mode of searchModes) {
        const { items, total } = await retryWithBackoff(async () => {
          const url = buildUrl(endpoint.path, keyword, pageNo, startDate, endDate, mode.paramName);
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`나라장터 API 오류 [${endpoint.path}/${mode.label}]: ${res.status}`);

          const json = await res.json();
          const items = json?.response?.body?.items ?? json?.items ?? json?.data ?? [];
          const total = parseInt(json?.response?.body?.totalCount ?? "0", 10);
          return { items: Array.isArray(items) ? items : [], total };
        }, 3);

        totalCount += total;
        for (const item of items as Record<string, unknown>[]) {
          const id = (item.bidNtceNo as string) ?? "";
          if (!id || seenIds.has(id)) continue; // 중복 제거
          seenIds.add(id);
          allItems.push(normalizeItem(item, endpoint.industryCode, endpoint.industryName));
        }
      }
    }

    return successResponse({
      keyword,
      startDate,
      endDate,
      industry,
      searchBy,
      pageNo,
      totalCount,
      items: allItems,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "서버 오류";
    return internalErrorResponse(msg);
  }
}

// ─── 유틸 ──────────────────────────────────────────────

interface NaraItem {
  bidNtceNo:       string;
  bidNtceNm:       string;
  ntceInsttNm:     string;
  dminsttNm:       string | null;
  presmptPrce:     number | null;
  bidClseDt:       string | null;
  bidNtceDt:       string | null;
  industryCode:    string;
  industryName:    string;
  bidNtceSttsCd:   string | null;
}

function normalizeItem(
  item: Record<string, unknown>,
  industryCode: string,
  industryName: string
): NaraItem {
  return {
    bidNtceNo:     (item.bidNtceNo    as string)  ?? "",
    bidNtceNm:     (item.bidNtceNm    as string)  ?? (item.prdctClsfcNoNm as string) ?? "제목 없음",
    ntceInsttNm:   (item.ntceInsttNm  as string)  ?? "",
    dminsttNm:     (item.dminsttNm    as string)  ?? null,
    presmptPrce:   parseFloat(item.presmptPrce as string) || null,
    bidClseDt:     (item.bidClseDt    as string)  ?? null,
    bidNtceDt:     (item.bidNtceDt    as string)  ?? (item.rgstDt as string) ?? null,
    bidNtceSttsCd: (item.bidNtceSttsCd as string) ?? null,
    industryCode,
    industryName,
  };
}

function buildUrl(
  endpointPath: string,
  keyword: string,
  pageNo: number,
  startDate: string,
  endDate: string,
  searchParamName: string = "bidNtceNm"
): string {
  const params = new URLSearchParams({
    serviceKey:          NARA_API_KEY,
    pageNo:              String(pageNo),
    numOfRows:           "100",
    type:                "json",
    inqryDiv:            "1",
    inqryBgnDt:          startDate,
    inqryEndDt:          endDate,
    [searchParamName]:   keyword,   // 공고명(bidNtceNm) 또는 기관명(ntceInsttNm)
  });
  return `${NARA_API_BASE}/ad/BidPublicInfoService/${endpointPath}?${params.toString()}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}2359`;
}

function getDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}0000`;
}
