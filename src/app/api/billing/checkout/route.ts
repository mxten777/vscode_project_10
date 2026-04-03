import { NextRequest } from "next/server";
import { getStripe, STRIPE_PRICES, type StripePriceKey } from "@/lib/stripe";
import { getAuthContext } from "@/lib/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  // Stripe 환경변수 미설정 시 graceful 안내
  if (!process.env.STRIPE_SECRET_KEY) {
    return errorResponse("STRIPE_NOT_CONFIGURED", "결제 시스템을 준비 중입니다. 잔시 후 다시 시도해 주세요.", 503);
  }

  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;
  const { user, orgId } = ctx;

  if (!orgId) {
    return errorResponse("NO_ORG", "소속 조직이 없습니다.", 400);
  }

  const body = await request.json().catch(() => ({}));
  const plan = body?.plan as string | undefined;

  const priceKey = `${plan}_monthly` as StripePriceKey;
  const priceId = STRIPE_PRICES[priceKey];

  if (!priceId) {
    return errorResponse("INVALID_PLAN", "유효하지 않은 플랜입니다. pro 또는 enterprise를 선택하세요.", 400);
  }

  const supabase = createServiceClient();

  // 기존 Stripe Customer ID 조회
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_cust_id")
    .eq("org_id", orgId)
    .single();

  let customerId = sub?.stripe_cust_id ?? undefined;

  // Customer ID가 없으면 Stripe에 신규 생성
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { org_id: orgId, user_id: user.id },
    });
    customerId = customer.id;

    // DB에 미리 저장 (webhook 수신 전 race condition 방지)
    await supabase
      .from("subscriptions")
      .upsert({ org_id: orgId, stripe_cust_id: customerId }, { onConflict: "org_id" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { org_id: orgId },
    success_url: `${appUrl}/settings/billing?success=true`,
    cancel_url:  `${appUrl}/pricing?canceled=true`,
    // 한국어 UI, 한국 결제 수단 우선
    locale: "ko",
    allow_promotion_codes: true,
  });

  return successResponse({ url: session.url });
}
