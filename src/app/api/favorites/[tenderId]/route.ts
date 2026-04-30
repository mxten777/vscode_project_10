import { NextRequest } from "next/server";
import { getAuthContext, PLAN_LIMITS } from "@/lib/auth-context";
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

    const { supabase, user, orgId, plan } = ctx;

    if (!orgId) {
      return errorResponse("NO_ORG", "조직에 가입되어 있지 않습니다", 400);
    }

    // 플랜별 즐겨찾기 수 제한 체크
    const limit = PLAN_LIMITS[plan].favorites;
    if (isFinite(limit)) {
      const { count } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("user_id", user.id);
      if ((count ?? 0) >= limit) {
        return errorResponse(
          "PLAN_LIMIT",
          `현재 플랜(${plan})에서는 즐겨찾기를 최대 ${limit}개까지 저장할 수 있습니다.`,
          403
        );
      }
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

    const { supabase, user, orgId } = ctx;

    if (!orgId) {
      return errorResponse("NO_ORG", "조직에 가입되어 있지 않습니다", 400);
    }

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("org_id", orgId)
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
