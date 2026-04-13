/**
 * GET /api/analysis/agency    - 기관별 분석
 * GET /api/analysis/industry  - 업종별 분석
 * GET /api/analysis/region    - 지역별 분석
 */
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import {
  getAgencyAnalysis,
  getIndustryAnalysis,
  getRegionAnalysis,
} from "@/lib/bid-intelligence-service";
import { apiResponse } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  const { type } = await params;
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

  try {
    let result;
    if (type === "agency") {
      result = await getAgencyAnalysis(limit);
    } else if (type === "industry") {
      result = await getIndustryAnalysis(limit);
    } else if (type === "region") {
      result = await getRegionAnalysis(limit);
    } else {
      return apiResponse.error("type must be agency|industry|region", 400);
    }

    return apiResponse.success(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return apiResponse.error(msg, 500);
  }
}
