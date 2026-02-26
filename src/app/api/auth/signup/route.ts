import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/auth/signup
 * 회원가입 + 자동 org 생성 + org_members 연결
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, orgName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "email, password 필수" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 1) Supabase Auth 회원가입
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

    const userId = authData.user.id;

    // 2) org 생성
    const { data: org, error: orgError } = await supabase
      .from("orgs")
      .insert({ name: orgName || `${email}의 조직` })
      .select("id")
      .single();

    if (orgError) {
      return NextResponse.json(
        { code: "ORG_ERROR", message: orgError.message },
        { status: 500 }
      );
    }

    // 3) org_members 연결 (admin)
    await supabase.from("org_members").insert({
      org_id: org.id,
      user_id: userId,
      role: "admin",
    });

    return NextResponse.json(
      { message: "회원가입 완료", userId, orgId: org.id },
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
