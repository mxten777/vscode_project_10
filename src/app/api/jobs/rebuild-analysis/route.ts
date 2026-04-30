/**
 * POST /api/jobs/rebuild-analysis
 * 기관/업종/지역 분석 캐시 재구성
 *
 * Schedule: 하루 1회 (vercel.json cron: "0 20 * * *" UTC = 새벽 5시 KST)
 * 수동 실행: Authorization: Bearer {CRON_SECRET}
 */
import { NextRequest } from "next/server";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";
import { failCollectionJob, finishCollectionJob, startCollectionJob } from "@/lib/collection-logs";
import { getErrorMessage } from "@/lib/job-utils";

export const preferredRegion = "icn1";

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const supabase = createServiceClient();
  const logId = await startCollectionJob(supabase, "analysis_rebuild");

  try {
    // Supabase RPC: 분석 캐시 전체 재구성
    const { data, error } = await supabase.rpc("rebuild_all_analysis");
    if (error) throw error;

    // analysis_level 재계산 (레벨 2/3 자동 승격)
    const { data: levelResult } = await supabase.rpc("compute_analysis_levels");

    await finishCollectionJob(supabase, logId, 0);

    return successResponse({ success: true, result: data, level_updates: levelResult });
  } catch (err) {
    const message = getErrorMessage(err);
    console.error("[rebuild-analysis]", err);

    await failCollectionJob(supabase, logId, message);

    return internalErrorResponse(message);
  }
}
