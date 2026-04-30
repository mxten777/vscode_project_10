import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { savedSearchUpdateSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user, orgId } = ctx;
    if (!orgId) {
      return errorResponse("NO_ORG", "조직에 가입되어 있지 않습니다", 400);
    }

    const body = await request.json();
    const parsed = savedSearchUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "잘못된 입력", 400, parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("saved_searches")
      .update({
        name: parsed.data.name,
        query_json: parsed.data.query_json,
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return errorResponse("DB_ERROR", error.message, 500);
    return successResponse(data);
  } catch (err) {
    console.error("PATCH /api/saved-searches/:id error:", err);
    return internalErrorResponse();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user, orgId } = ctx;
    if (!orgId) {
      return errorResponse("NO_ORG", "조직에 가입되어 있지 않습니다", 400);
    }

    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId)
      .eq("user_id", user.id);

    if (error) return errorResponse("DB_ERROR", error.message, 500);
    return successResponse({ message: "저장한 검색 삭제 완료" });
  } catch (err) {
    console.error("DELETE /api/saved-searches/:id error:", err);
    return internalErrorResponse();
  }
}