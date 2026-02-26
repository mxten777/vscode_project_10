import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/health
 * Vercel/로드밸런서 헬스 체크
 */
export function GET(_request: NextRequest) {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
