/**
 * GET /api/dashboard/summary
 * 실데이터 기반 대시보드 KPI 집계
 */
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { getDashboardSummary } from "@/lib/bid-intelligence-service";
import { apiResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  void request;
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  try {
    const result = await getDashboardSummary();
    return apiResponse.success(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return apiResponse.error(msg, 500);
  }
}
