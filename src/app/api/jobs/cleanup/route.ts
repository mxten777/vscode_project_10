/**
 * DB 정리 Cron Job
 *
 * - alert_logs 90일 이전 레코드 삭제
 * - collection_logs 90일 이전 레코드 삭제
 *
 * Schedule: 매주 일요일 UTC 01:00 (10:00 KST)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("run_cleanup_jobs");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "DB cleanup 완료",
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cleanup] Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
