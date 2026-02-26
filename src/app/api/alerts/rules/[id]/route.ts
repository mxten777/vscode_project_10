import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { alertRuleUpdateSchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api-response";

/**
 * PATCH /api/alerts/rules/:id — 알림 규칙 수정
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user } = ctx;

    const body = await request.json();
    const parsed = alertRuleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "잘못된 입력", 400, parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("alert_rules")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return notFoundResponse("규칙을 찾을 수 없습니다");
      return errorResponse("DB_ERROR", error.message, 500);
    }

    return successResponse(data);
  } catch (err) {
    console.error("PATCH /api/alerts/rules/:id error:", err);
    return internalErrorResponse();
  }
}

/**
 * DELETE /api/alerts/rules/:id
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user } = ctx;

    const { error } = await supabase
      .from("alert_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return errorResponse("DB_ERROR", error.message, 500);

    return successResponse({ message: "삭제 완료" });
  } catch (err) {
    console.error("DELETE /api/alerts/rules/:id error:", err);
    return internalErrorResponse();
  }
}
