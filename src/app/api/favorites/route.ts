import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

/**
 * GET /api/favorites
 * 즐겨찾기 목록
 */
export async function GET(_request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user } = ctx;

    const { data, error } = await supabase
      .from("favorites")
      .select("*, tender:tenders(*, agency:agencies(*))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return internalErrorResponse(error.message);
    }

    return successResponse(data);
  } catch (err) {
    console.error("GET /api/favorites error:", err);
    return internalErrorResponse();
  }
}
