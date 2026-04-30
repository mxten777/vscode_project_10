import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/helpers";
import { runCronStep, type CronStep } from "@/lib/cron-orchestrator";

export const preferredRegion = "icn1";
export const maxDuration = 60;

const INGEST_STEPS: CronStep[] = [
  {
    name: "poll-tenders",
    path: "/api/jobs/poll-tenders?maxPages=3&lookbackDays=2",
    method: "POST",
  },
  {
    name: "collect-bid-awards",
    path: "/api/jobs/collect-bid-awards?lookbackDays=2&maxPages=1&maxItems=25",
    method: "GET",
  },
];

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];
  let hasFailure = false;

  for (const step of INGEST_STEPS) {
    const result = await runCronStep(request, step);
    results.push(result);
    if (!result.ok) {
      hasFailure = true;
      break;
    }
  }

  return NextResponse.json(
    {
      success: !hasFailure,
      ran_at: new Date().toISOString(),
      mode: "cron-ingest",
      results,
    },
    { status: hasFailure ? 207 : 200 }
  );
}
