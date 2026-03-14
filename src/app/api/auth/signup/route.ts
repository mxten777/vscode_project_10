import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/auth/signup
 * 회원가입 (org 자동 생성은 DB 트리거에서 처리 — migration 002)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "email, password 필수" },
        { status: 400 }
      );
    }

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
