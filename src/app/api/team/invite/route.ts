/**
 * POST /api/team/invite
 * 팀 멤버 초대 이메일 발송 + org_invitations 레코드 생성
 *
 * Body: { email: string, role?: "admin" | "member" }
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { apiResponse, successResponse } from "@/lib/api-response";
import { EmailProvider } from "@/lib/notifications/email-provider";
import { z } from "zod";
import crypto from "crypto";

const inviteSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  role: z.enum(["admin", "member"]).default("member"),
});

const email = new EmailProvider();

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  if (ctx.role !== "admin") {
    return apiResponse.error("관리자만 초대할 수 있습니다.", 403);
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse.error(parsed.error.issues[0]?.message ?? "입력값 오류", 400);
  }

  const { email: inviteeEmail, role } = parsed.data;
  const supabase = createServiceClient();

  // 이미 조직 멤버인지 확인
  const { data: existing } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", ctx.orgId!)
    .eq("user_id", (
      await supabase.auth.admin.listUsers()
    ).data.users.find((u) => u.email === inviteeEmail)?.id ?? "")
    .maybeSingle();

  if (existing) {
    return apiResponse.error("이미 조직 멤버입니다.", 409);
  }

  // 유효한 기존 초대 있는지 확인
  const { data: existingInvite } = await supabase
    .from("org_invitations")
    .select("id")
    .eq("org_id", ctx.orgId!)
    .eq("email", inviteeEmail)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingInvite) {
    return apiResponse.error("해당 이메일로 이미 유효한 초대가 존재합니다.", 409);
  }

  // 초대 토큰 생성 (48시간 유효)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from("org_invitations").insert({
    org_id: ctx.orgId!,
    email: inviteeEmail,
    role,
    token,
    expires_at: expiresAt,
  });

  if (insertError) {
    return apiResponse.error("초대 생성 실패: " + insertError.message, 500);
  }

  // 초대 이메일 발송
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bid-platform.vercel.app";
  const inviteUrl = `${appUrl}/invite/accept?token=${token}`;

  const { data: org } = await supabase
    .from("orgs")
    .select("name")
    .eq("id", ctx.orgId!)
    .single();

  await email.send({
    to: inviteeEmail,
    subject: `[Smart Bid Radar] ${org?.name ?? "팀"}에 초대되었습니다`,
    body: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">팀 초대</h2>
        <p><strong>${ctx.user.email}</strong>님이 <strong>${org?.name ?? "조직"}</strong>에 초대합니다.</p>
        <p>아래 버튼을 클릭하여 초대를 수락하세요. (48시간 유효)</p>
        <a href="${inviteUrl}"
           style="display:inline-block; background:#4f46e5; color:#fff; padding:12px 24px;
                  border-radius:6px; text-decoration:none; font-weight:600; margin:16px 0;">
          초대 수락하기
        </a>
        <p style="color:#888; font-size:12px;">링크가 작동하지 않으면 아래 URL을 복사하세요:<br/>${inviteUrl}</p>
      </div>
    `,
  });

  return successResponse({ message: "초대 이메일을 발송했습니다." }, 201);
}

/**
 * GET /api/team/invite
 * 현재 조직의 대기 중인 초대 목록
 */
export async function GET() {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  if (ctx.role !== "admin") {
    return apiResponse.error("관리자만 조회할 수 있습니다.", 403);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("org_invitations")
    .select("id, email, role, expires_at, created_at")
    .eq("org_id", ctx.orgId!)
    .order("created_at", { ascending: false });

  if (error) return apiResponse.error(error.message, 500);

  return successResponse({ invitations: data });
}
