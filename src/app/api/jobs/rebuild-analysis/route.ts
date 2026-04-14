/**
 * POST /api/jobs/rebuild-analysis
 * 기관/업종/지역 분석 캐시 재구성
 *
 * Schedule: 하루 1회 (vercel.json cron: "0 20 * * *" UTC = 새벽 5시 KST)
 * 수동 실행: Authorization: Bearer {CRON_SECRET}
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";

export const preferredRegion = "icn1";

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();
  let logId: string | null = null;

  try {
    // 수집 시작 기록
    const { data: logRow } = await supabase
      .from("collection_logs")
      .insert({
        job_type: "analysis_rebuild",
        status: "running",
        started_at: startedAt,
      })
      .select("id")
      .single();
    logId = logRow?.id ?? null;

    // Supabase RPC: 분석 캐시 전체 재구성
    const { data, error } = await supabase.rpc("rebuild_all_analysis");
    if (error) throw error;

    // analysis_level 재계산 (레벨 2/3 자동 승격)
    const { data: levelResult } = await supabase.rpc("compute_analysis_levels");

    await supabase
      .from("collection_logs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        records_collected: 0,
        metadata: { ...((data as Record<string, unknown>) ?? {}), level_updates: levelResult },
      })
      .eq("id", logId!);

    return NextResponse.json({ success: true, result: data, level_updates: levelResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[rebuild-analysis]", err);

    if (logId) {
      const supabackup = createServiceClient();
      await supabackup
        .from("collection_logs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq("id", logId);
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
