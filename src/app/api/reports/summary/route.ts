import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { successResponse, internalErrorResponse } from "@/lib/api-response";

/**
 * GET /api/reports/summary?from=&to=
 * 공고 수, 기관 TOP, 업종 TOP, 예산 합
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const supabase = await createClient();

    // Postgres RPC 함수 호출 (단일 쿼리로 모든 집계 처리 - 성능 개선)
    const { data, error } = await supabase.rpc("report_summary", {
      from_date: from || null,
      to_date: to || null,
    });

    if (error) {
      console.error("RPC report_summary error:", error);
      return internalErrorResponse();
    }

    return successResponse(data);
  } catch (err) {
    console.error("GET /api/reports/summary error:", err);
    return internalErrorResponse();
  }
}
