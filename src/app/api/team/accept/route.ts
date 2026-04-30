/**
 * POST /api/team/accept
 * 초대 토큰 검증 + 조직 멤버 추가
 *
 * Body: { token: string }
 * 인증: 현재 로그인한 사용자 기준 (로그인 유도 필요)
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { apiResponse, successResponse } from "@/lib/api-response";
import { z } from "zod";

const acceptSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse.error("토큰이 필요합니다.", 400);
  }

  const { token } = parsed.data;
  const supabase = createServiceClient();

  // 초대 토큰 조회
  const { data: invitation, error: inviteError } = await supabase
    .from("org_invitations")
    .select("id, org_id, email, role, expires_at")
    .eq("token", token)
    .single();

  if (inviteError || !invitation) {
    return apiResponse.error("유효하지 않은 초대 링크입니다.", 404);
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return apiResponse.error("만료된 초대 링크입니다.", 410);
  }

  if (invitation.email !== ctx.user.email) {
    return apiResponse.error("이 초대는 다른 이메일 주소로 발송되었습니다.", 403);
  }

  // 이미 멤버인지 확인
  const { data: existingMember } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", invitation.org_id)
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (existingMember) {
    // 초대 삭제 후 성공 반환 (멱등성)
    await supabase.from("org_invitations").delete().eq("id", invitation.id);
    return successResponse({ message: "이미 조직 멤버입니다." });
  }

  // 조직 멤버 추가
  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: invitation.org_id,
    user_id: ctx.user.id,
    role: invitation.role,
  });

  if (memberError) {
    return apiResponse.error("멤버 추가 실패: " + memberError.message, 500);
  }

  // 초대 삭제 (일회용)
  await supabase.from("org_invitations").delete().eq("id", invitation.id);

  return successResponse({ message: "팀에 합류했습니다.", orgId: invitation.org_id });
}
