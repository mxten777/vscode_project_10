import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { savedSearchCreateSchema } from "@/lib/validations";

const MAX_SAVED_SEARCHES = 8;

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user, orgId } = ctx;
    if (!orgId) {
      return errorResponse("NO_ORG", "조직에 가입되어 있지 않습니다", 400);
    }

    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_SAVED_SEARCHES);

    if (error) return internalErrorResponse(error.message);
    return successResponse(data);
  } catch (err) {
    console.error("GET /api/saved-searches error:", err);
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
    const parsed = savedSearchCreateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "잘못된 입력", 400, parsed.error.flatten());
    }

    const { count, error: countError } = await supabase
      .from("saved_searches")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("user_id", user.id);

    if (countError) return internalErrorResponse(countError.message);
    if ((count ?? 0) >= MAX_SAVED_SEARCHES) {
      return errorResponse("LIMIT_REACHED", `저장한 검색은 최대 ${MAX_SAVED_SEARCHES}개까지 보관할 수 있습니다`, 400);
    }

    const { data, error } = await supabase
      .from("saved_searches")
      .insert({
        org_id: orgId,
        user_id: user.id,
        name: parsed.data.name,
        query_json: parsed.data.query_json,
      })
      .select()
      .single();

    if (error) return errorResponse("DB_ERROR", error.message, 500);
    return successResponse(data, 201);
  } catch (err) {
    console.error("POST /api/saved-searches error:", err);
    return internalErrorResponse();
  }
}