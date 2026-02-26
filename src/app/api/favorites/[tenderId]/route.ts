import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

/**
 * POST /api/favorites/:tenderId — 즐겨찾기 추가
 * DELETE /api/favorites/:tenderId — 즐겨찾기 제거
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  try {
    const { tenderId } = await params;
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user, orgId } = ctx;

    if (!orgId) {
      return errorResponse("NO_ORG", "조직에 가입되어 있지 않습니다", 400);
    }

    const { data, error } = await supabase
      .from("favorites")
      .upsert(
        {
          org_id: orgId,
          user_id: user.id,
          tender_id: tenderId,
        },
        { onConflict: "user_id,tender_id" }
      )
      .select()
      .single();

    if (error) {
      return errorResponse("DB_ERROR", error.message, 500);
    }

    return successResponse(data, 201);
  } catch (err) {
    console.error("POST /api/favorites/:tenderId error:", err);
    return internalErrorResponse();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  try {
    const { tenderId } = await params;
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user } = ctx;

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("tender_id", tenderId);

    if (error) {
      return errorResponse("DB_ERROR", error.message, 500);
    }

    return successResponse({ message: "즐겨찾기 삭제 완료" });
  } catch (err) {
    console.error("DELETE /api/favorites/:tenderId error:", err);
    return internalErrorResponse();
  }
}
