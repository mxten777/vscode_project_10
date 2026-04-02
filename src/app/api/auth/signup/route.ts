import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
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
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const supabase = createServiceClient();

    // Supabase Auth 회원가입 (org + org_members는 트리거가 자동 생성)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { code: "AUTH_ERROR", message: authError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "회원가입 완료", userId: authData.user.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "서버 오류" },
      { status: 500 }
    );
  }
}
