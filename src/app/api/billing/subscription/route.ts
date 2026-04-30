import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { errorResponse, successResponse } from "@/lib/api-response";

function buildFreeSubscription(requiresOrganization = false) {
  return {
    plan: "free" as const,
    status: "active",
    current_period_end: null,
    cancel_at_period_end: false,
    has_stripe: false,
    requiresOrganization,
  };
}

/**
 * GET /api/billing/subscription
 * 현재 org의 구독 정보 반환
 */
export async function GET(request: NextRequest) {
  void request;

  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;
  const { orgId } = ctx;

  if (!orgId) {
    return successResponse(buildFreeSubscription(true));
  }

  const supabase = createServiceClient();
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, cancel_at_period_end, stripe_sub_id, stripe_cust_id")
    .eq("org_id", orgId)
    .single();

  if (error || !sub) {
    // 구독 레코드 없음 → free plan
    return successResponse(buildFreeSubscription());
  }

  return successResponse({
    plan: sub.plan ?? "free",
    status: sub.status ?? "active",
    current_period_end: sub.current_period_end,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    has_stripe: !!sub.stripe_cust_id,
  });
}
