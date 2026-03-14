import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tenderSearchSchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

/**
 * GET /api/tenders
 * 입찰 공고 목록 — 필터/정렬/페이지네이션
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);

    const parsed = tenderSearchSchema.safeParse(params);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "잘못된 쿼리 파라미터", 400, parsed.error.flatten());
    }

    const {
      q,
      status,
      regionCode,
      industryCode,
      budgetMin,
      budgetMax,
      agencyId,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = parsed.data;

    const supabase = await createClient();

    // Count query
    let countQuery = supabase
      .from("tenders")
      .select("*", { count: "exact", head: true });

    // Data query — raw_json 포함 (공고일·마감일 원본 표시용, G2B 공개 데이터)
    let dataQuery = supabase
      .from("tenders")
      .select(`
        id, source_tender_id, title, demand_agency_name,
        budget_amount, region_code, region_name, industry_code, industry_name,
        method_type, published_at, deadline_at, status, created_at, updated_at,
        raw_json,
        agency:agencies(id, code, name),
        award:awards(id, winner_company_name, awarded_amount, awarded_rate, opened_at)
      `);

    // 필터 적용 (count + data 동시)
    const applyFilters = (query: typeof countQuery | typeof dataQuery) => {
      // 검색어: title 또는 demand_agency_name에서 매칭 (pg_trgm % 연산자 활용)
      if (q) {
        query = query.or(`title.ilike.%${q}%,demand_agency_name.ilike.%${q}%`);
      }
      if (status) query = query.eq("status", status);
      if (regionCode) query = query.eq("region_code", regionCode);
      if (industryCode) query = query.eq("industry_code", industryCode);
      if (budgetMin != null) query = query.gte("budget_amount", budgetMin);
      if (budgetMax != null) query = query.lte("budget_amount", budgetMax);
      if (agencyId) query = query.eq("agency_id", agencyId);
      return query;
    };

    countQuery = applyFilters(countQuery) as typeof countQuery;
    dataQuery = applyFilters(dataQuery) as typeof dataQuery;

    // 정렬
    dataQuery = dataQuery.order(sortBy!, { ascending: sortOrder === "asc" });

    // 페이지네이션
    const from = (page! - 1) * pageSize!;
    const to = from + pageSize! - 1;
    dataQuery = dataQuery.range(from, to);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (dataResult.error) {
      console.error("GET /api/tenders DB error:", dataResult.error);
      return internalErrorResponse();
    }

    return successResponse({
      data: dataResult.data,
      total: countResult.count ?? 0,
      page: page!,
      pageSize: pageSize!,
    });
  } catch (err) {
    console.error("GET /api/tenders error:", err);
    return internalErrorResponse();
  }
}
