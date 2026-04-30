import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/helpers";
import { runCronStep, type CronStep } from "@/lib/cron-orchestrator";

export const preferredRegion = "icn1";
export const maxDuration = 60;

const MAINTENANCE_STEPS: CronStep[] = [
  {
    name: "process-alerts",
    path: "/api/jobs/process-alerts",
    method: "POST",
    days: [1, 2, 3, 4, 5],
  },
  {
    name: "rebuild-analysis",
    path: "/api/jobs/rebuild-analysis",
    method: "POST",
  },
  {
    name: "collect-participants",
    path: "/api/jobs/collect-participants",
    method: "GET",
  },
  {
    name: "embed-batch",
    path: "/api/ai/embed-batch",
    method: "POST",
    days: [1],
  },
  {
    name: "cleanup",
    path: "/api/jobs/cleanup",
    method: "GET",
    days: [0],
  },
];

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayOfWeek = new Date().getUTCDay();
  const scheduledSteps = MAINTENANCE_STEPS.filter((step) => {
    return !step.days || step.days.includes(dayOfWeek);
  });

  const results = [];
  let hasFailure = false;

  for (const step of scheduledSteps) {
    const result = await runCronStep(request, step);
    results.push(result);
    if (!result.ok) {
      hasFailure = true;
    }
  }

  return NextResponse.json(
    {
      success: !hasFailure,
      ran_at: new Date().toISOString(),
      mode: "cron-maintenance",
      day_of_week_utc: dayOfWeek,
      results,
    },
    { status: hasFailure ? 207 : 200 }
  );
}
