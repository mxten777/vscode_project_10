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

  // 멤버 user_id 목록으로 사용자 정보 조회 (전체 listUsers 대신 필터링)
  const userIds = (data ?? []).map((m) => m.user_id);
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    for (const u of usersData?.users ?? []) {
      if (userIds.includes(u.id)) userMap.set(u.id, u.email ?? "");
    }
  }

  const members = (data ?? []).map((m) => ({
    ...m,
    email: userMap.get(m.user_id) ?? "",
  }));

  return successResponse({ members });
}
