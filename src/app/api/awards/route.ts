import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, internalErrorResponse } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-context";

const awardsQuerySchema = z.object({
  q: z.string().optional(),                          // 낙찰업체명 검색
  sortBy: z
    .enum(["opened_at", "awarded_amount", "awarded_rate"])
    .optional()
    .default("opened_at"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * GET /api/awards
 * 낙찰 이력 목록 — 업체명 검색 / 정렬 / 페이지네이션
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);

    const parsed = awardsQuerySchema.safeParse(params);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "잘못된 쿼리 파라미터", 400, parsed.error.flatten());
    }

    const { q, sortBy, sortOrder, page, pageSize } = parsed.data;
    const { supabase } = ctx;

    const selectFields = `
      id, winner_company_name, awarded_amount, awarded_rate, opened_at,
      bid_notice_no, participant_count,
      tender:tenders(id, title, demand_agency_name, budget_amount, industry_name, region_name, status)
    `;

    let countQuery = supabase
      .from("awards")
      .select("*", { count: "exact", head: true })
      .not("winner_company_name", "is", null);

    let dataQuery = supabase
      .from("awards")
      .select(selectFields)
      .not("winner_company_name", "is", null);

    if (q) {
      countQuery = countQuery.ilike("winner_company_name", `%${q}%`);
      dataQuery = dataQuery.ilike("winner_company_name", `%${q}%`);
    }

    dataQuery = dataQuery.order(sortBy!, { ascending: sortOrder === "asc" });

    const from = (page! - 1) * pageSize!;
    const to = from + pageSize! - 1;
    dataQuery = dataQuery.range(from, to);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error || dataResult.error) {
      console.error("GET /api/awards DB error:", countResult.error ?? dataResult.error);
      return internalErrorResponse();
    }

    return successResponse({
      data: dataResult.data,
      total: countResult.count ?? 0,
      page: page!,
      pageSize: pageSize!,
    });
  } catch (err) {
    console.error("GET /api/awards error:", err);
    return internalErrorResponse();
  }
}
