import { createClient } from "@/lib/supabase/server";
import { successResponse } from "@/lib/api-response";

/**
 * POST /api/auth/signout
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return successResponse({ message: "로그아웃 완료" });
}
