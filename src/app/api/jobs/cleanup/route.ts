/**
 * DB 정리 Cron Job
 *
 * - alert_logs 90일 이전 레코드 삭제
 * - collection_logs 90일 이전 레코드 삭제
 *
 * Schedule: 매주 일요일 UTC 01:00 (10:00 KST)
 */

import { NextRequest } from "next/server";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";
import { failCollectionJob, finishCollectionJob, startCollectionJob } from "@/lib/collection-logs";
import { getErrorMessage } from "@/lib/job-utils";

function countCleanupRows(result: unknown) {
  if (!result || typeof result !== "object") return 0;

  return Object.values(result as Record<string, unknown>).reduce<number>((sum, value) => {
    return typeof value === "number" ? sum + value : sum;
  }, 0);
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const logId = await startCollectionJob(supabase, "cleanup");

  try {
    if (!verifyCronSecret(request)) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const { data, error } = await supabase.rpc("run_cleanup_jobs");

    if (error) {
      throw error;
    }

    await finishCollectionJob(supabase, logId, countCleanupRows(data));

    return successResponse({
      success: true,
      message: "DB cleanup 완료",
      result: data,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    await failCollectionJob(supabase, logId, message);
    console.error("[cleanup] Error:", error);
    return internalErrorResponse(message);
  }
}
