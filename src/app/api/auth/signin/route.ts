import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validations";

/**
 * POST /api/auth/signin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { code: "AUTH_ERROR", message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: "로그인 성공",
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (err) {
    console.error("signin error:", err);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "서버 오류" },
      { status: 500 }
    );
  }
}
