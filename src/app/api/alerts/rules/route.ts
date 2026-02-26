import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { alertRuleCreateSchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

/**
 * GET /api/alerts/rules — 알림 규칙 목록
 * POST /api/alerts/rules — 알림 규칙 생성
 */
export async function GET(_request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user } = ctx;

    const { data, error } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return internalErrorResponse(error.message);
    return successResponse(data);
  } catch (err) {
    console.error("GET /api/alerts/rules error:", err);
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user, orgId } = ctx;

    if (!orgId) {
      return errorResponse("NO_ORG", "조직에 가입되어 있지 않습니다", 400);
    }

    const body = await request.json();
    const parsed = alertRuleCreateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "잘못된 입력", 400, parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("alert_rules")
      .insert({
        org_id: orgId,
        user_id: user.id,
        ...parsed.data,
      })
      .select()
      .single();

    if (error) return errorResponse("DB_ERROR", error.message, 500);

    return successResponse(data, 201);
  } catch (err) {
    console.error("POST /api/alerts/rules error:", err);
    return internalErrorResponse();
  }
}
