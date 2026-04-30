import { getAuthContext } from "@/lib/auth-context";
import { successResponse, errorResponse, internalErrorResponse } from "@/lib/api-response";

/**
 * GET /api/alerts/logs — 알림 발송 이력
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase, user, orgId } = ctx;

    if (!orgId) {
      return errorResponse("NO_ORG", "조직에 가입되어 있지 않습니다", 400);
    }

    const { data, error } = await supabase
      .from("alert_logs")
      .select("*, tender:tenders(id, title, status)")
      .in(
        "alert_rule_id",
        (
          await supabase
            .from("alert_rules")
            .select("id")
            .eq("org_id", orgId)
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
