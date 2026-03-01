import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api-response";

/**
 * GET /api/tenders/:id
 * 공고 상세 + awards 조인
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // raw_json 제외 (보안: G2B 원본 필드 클라이언트 노출 차단)
    const { data, error } = await supabase
      .from("tenders")
      .select(`
        id, source_tender_id, title, demand_agency_name,
        budget_amount, region_code, region_name, industry_code, industry_name,
        method_type, published_at, deadline_at, status, created_at, updated_at,
        agency:agencies(id, code, name),
        award:awards(id, winner_company_name, awarded_amount, awarded_rate, opened_at)
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return notFoundResponse("공고를 찾을 수 없습니다");
    }

    // 현재 사용자의 즐겨찾기 여부 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let isFavorited = false;
    if (user) {
      const { data: fav } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("tender_id", id)
        .maybeSingle();
      isFavorited = !!fav;
    }

    return successResponse({ ...data, is_favorited: isFavorited });
  } catch (err) {
    console.error("GET /api/tenders/:id error:", err);
    return internalErrorResponse();
  }
}
