import { createClient } from "@/lib/supabase/server";
import { unauthorizedResponse } from "@/lib/api-response";

/**
 * 플랜별 제한값
 */
export const PLAN_LIMITS = {
  free:       { alertRules: 3,   favorites: 50 },
  pro:        { alertRules: 50,  favorites: Infinity },
  enterprise: { alertRules: Infinity, favorites: Infinity },
} as const;

export type OrgPlan = keyof typeof PLAN_LIMITS;

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
    .select("org_id, role, org:orgs(plan)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const rawPlan = (membership?.org as { plan?: string } | null)?.plan ?? "free";
  const plan = (rawPlan in PLAN_LIMITS ? rawPlan : "free") as OrgPlan;

  return {
    user,
    orgId: membership?.org_id as string | undefined,
    role: membership?.role as string | undefined,
    plan,
    supabase,
  } as const;
}
