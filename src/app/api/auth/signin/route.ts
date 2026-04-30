import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { signInSchema } from "@/lib/validations";

/**
 * POST /api/auth/signin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다",
        400
      );
    }
    const { email, password } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return errorResponse("AUTH_ERROR", error.message, 401);
    }

    return successResponse({
      message: "로그인 성공",
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (err) {
    console.error("signin error:", err);
    return internalErrorResponse("서버 오류");
  }
}
