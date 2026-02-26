import { createClient } from "@/lib/supabase/server";
import { unauthorizedResponse } from "@/lib/api-response";

/**
 * 서버 API 라우트에서 사용자 인증 + org 조회 헬퍼
 * 인증 실패 시 NextResponse를 반환, 성공 시 user + org 정보를 반환
 */
export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: unauthorizedResponse() } as const;
  }

  // 사용자의 첫 번째 org 가져오기 (MVP: 단일 org)
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  return {
    user,
    orgId: membership?.org_id as string | undefined,
    role: membership?.role as string | undefined,
    supabase,
  } as const;
}
