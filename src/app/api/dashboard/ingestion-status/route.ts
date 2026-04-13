/**
 * GET /api/dashboard/ingestion-status
 * 수집 파이프라인 운영 상태 조회
 */
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { getIngestionStatus } from "@/lib/bid-intelligence-service";
import { apiResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  void request;
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  try {
    const status = await getIngestionStatus();
    return apiResponse.success(status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return apiResponse.error(msg, 500);
  }
}
