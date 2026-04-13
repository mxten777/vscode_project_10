import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAuthContext } from "@/lib/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { errorResponse, successResponse } from "@/lib/api-response";

/**
 * POST /api/billing/portal
 * Stripe Customer Portal 세션 생성 → 구독 관리 페이지(카드 변경, 해지 등) URL 반환
 */
export async function POST(request: NextRequest) {
  void request;

  if (!process.env.STRIPE_SECRET_KEY) {
    return errorResponse("STRIPE_NOT_CONFIGURED", "결제 시스템을 준비 중입니다.", 503);
  }

  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;
  const { orgId } = ctx;

  if (!orgId) {
    return errorResponse("NO_ORG", "소속 조직이 없습니다.", 400);
  }

  const supabase = createServiceClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_cust_id")
    .eq("org_id", orgId)
    .single();

  if (!sub?.stripe_cust_id) {
    return errorResponse("NO_CUSTOMER", "Stripe 고객 정보가 없습니다. 먼저 플랜을 구독해 주세요.", 404);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_cust_id,
    return_url: `${appUrl}/settings/billing`,
  });

  return successResponse({ url: session.url });
}
