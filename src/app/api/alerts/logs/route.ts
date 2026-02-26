import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { successResponse, internalErrorResponse } from "@/lib/api-response";

/**
 * GET /api/alerts/logs — 알림 발송 이력
 */
export async function GET(_request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user } = ctx;

    const { data, error } = await supabase
      .from("alert_logs")
      .select("*, tender:tenders(id, title, status)")
      .in(
        "alert_rule_id",
        (
          await supabase
            .from("alert_rules")
            .select("id")
            .eq("user_id", user.id)
        ).data?.map((r) => r.id) ?? []
      )
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error) return internalErrorResponse(error.message);

    return successResponse(data);
  } catch (err) {
    console.error("GET /api/alerts/logs error:", err);
    return internalErrorResponse();
  }
}
