/**
 * AI 낙찰률 예측 프록시
 * POST /api/ai/predict
 * → bid-ai-service POST /predict/bid-rate
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { apiResponse } from "@/lib/api-response";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  if (!AI_SERVICE_URL) {
    return apiResponse.error("AI 서비스가 설정되지 않았습니다.", 503);
  }

  const body = await request.json();

  const upstream = await fetch(`${AI_SERVICE_URL}/predict/bid-rate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AI_SERVICE_API_KEY ?? "",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  return NextResponse.json(data);
}
