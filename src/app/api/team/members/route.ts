/**
 * GET  /api/team/members       — 멤버 목록 (admin only)
 * DELETE /api/team/members     — 본인 탈퇴 / admin이 다른 멤버 제거
 */

import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { apiResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, role, created_at")
    .eq("org_id", ctx.orgId!);

  if (error) return apiResponse.error(error.message, 500);

  // auth.users 이메일 보강
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const userMap = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const members = (data ?? []).map((m) => ({
    ...m,
    email: userMap.get(m.user_id) ?? "",
  }));

  return successResponse({ members });
}
