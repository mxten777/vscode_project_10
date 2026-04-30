import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { signUpSchema } from "@/lib/validations";

/**
 * POST /api/auth/signup
 * 회원가입 (org 자동 생성은 DB 트리거에서 처리 — migration 002)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다",
        400
      );
    }
    const { email, password, orgName } = parsed.data;

    const supabase = createServiceClient();

    // Supabase Auth 회원가입 (org + org_members는 트리거가 자동 생성)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return errorResponse("AUTH_ERROR", authError.message, 400);
    }

    const userId = authData.user.id;

    const { data: membership, error: membershipError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      return errorResponse("DB_ERROR", membershipError.message, 500);
    }

    let orgId = membership?.org_id ?? null;

    // DB 트리거가 없거나 적용되지 않은 환경에서도 신규 사용자가 바로 조직 기능을 사용할 수 있게 보장합니다.
    if (!orgId) {
      const fallbackOrgName = orgName?.trim() || `${email.split("@")[0]}의 조직`;
      const { data: org, error: orgError } = await supabase
        .from("orgs")
        .insert({ name: fallbackOrgName, plan: "free" })
        .select("id")
        .single();

      if (orgError) {
        return errorResponse("DB_ERROR", orgError.message, 500);
      }

      orgId = org.id;

      const { error: memberInsertError } = await supabase
        .from("org_members")
        .insert({ org_id: orgId, user_id: userId, role: "admin" });

      if (memberInsertError) {
        return errorResponse("DB_ERROR", memberInsertError.message, 500);
      }
    }

    return successResponse({ message: "회원가입 완료", userId, orgId }, 201);
  } catch (err) {
    console.error("signup error:", err);
    return internalErrorResponse("서버 오류");
  }
}
