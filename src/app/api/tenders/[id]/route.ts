import { NextRequest } from "next/server";
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-context";

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
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;
    const { supabase, user, orgId } = ctx;

    // raw_json 포함 (공고일·마감일 원본 표시용, G2B 공개 데이터)
    const { data, error } = await supabase
      .from("tenders")
      .select(`
        id, source_tender_id, title, demand_agency_name,
        budget_amount, region_code, region_name, industry_code, industry_name,
        method_type, published_at, deadline_at, status, created_at, updated_at,
        raw_json, analysis_level, participants_collected, participants_collected_at,
        agency:agencies(id, code, name),
        award:awards(id, winner_company_name, awarded_amount, awarded_rate, opened_at)
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return notFoundResponse("공고를 찾을 수 없습니다");
    }

    // awards가 없으면 bid_participants(낙찰자)에서 폴백
    let award = (data.award as unknown) as {
      winner_company_name: string | null;
      awarded_amount: number | null;
      awarded_rate: number | null;
      opened_at: string | null;
    } | null;

    if (!award) {
      const { data: winner } = await supabase
        .from("bid_participants")
        .select("company_name, bid_amount, bid_rate")
        .eq("tender_id", id)
        .eq("is_winner", true)
        .order("bid_rank", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (winner) {
        award = {
          winner_company_name: winner.company_name ?? null,
          awarded_amount: winner.bid_amount ?? null,
          awarded_rate: winner.bid_rate ?? null,
          opened_at: null, // bid_participants에는 개찰일 없음
        };
      }
    }

    // 현재 사용자의 즐겨찾기 여부 확인
    let isFavorited = false;
    if (user && orgId) {
      const { data: fav } = await supabase
        .from("favorites")
        .select("id")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .eq("tender_id", id)
        .maybeSingle();
      isFavorited = !!fav;
    }

    return successResponse({ ...data, award, is_favorited: isFavorited });
  } catch (err) {
    console.error("GET /api/tenders/:id error:", err);
    return internalErrorResponse();
  }
}
