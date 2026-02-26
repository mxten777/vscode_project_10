import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/signout
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ message: "로그아웃 완료" });
}
