import { NextRequest } from "next/server";
import { getStripe, priceIdToPlan } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { errorResponse, successResponse } from "@/lib/api-response";
import type Stripe from "stripe";

// Stripe Webhook은 raw body가 필요 → body parser 비활성화
export const runtime = "nodejs";

/**
 * POST /api/billing/webhook
 * Stripe 이벤트 수신 → 구독 상태 동기화
 *
 * 처리 이벤트:
 *   checkout.session.completed      → 신규 구독 → plan 업그레이드
 *   customer.subscription.updated   → 플랜 변경 / 갱신
 *   customer.subscription.deleted   → 구독 해지 → free 강등
 *   invoice.payment_failed          → 결제 실패 → past_due
 *   invoice.payment_succeeded       → 결제 성공 → active 복구
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET 미설정");
    return errorResponse("WEBHOOK_SECRET_MISSING", "Webhook secret not configured", 500);
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return errorResponse("MISSING_SIGNATURE", "Missing stripe-signature", 400);
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe Webhook 서명 검증 실패:", err);
    return errorResponse("INVALID_SIGNATURE", "Invalid signature", 400);
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      // ── 신규 체크아웃 완료 ──────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const orgId       = session.metadata?.org_id;
        const subId       = session.subscription as string;
        const customerId  = session.customer as string;

        if (!orgId || !subId) break;

        const fullSub = await getStripe().subscriptions.retrieve(subId);
        const priceId = fullSub.items.data[0]?.price.id ?? "";
        const plan    = priceIdToPlan(priceId);

        await supabase.from("subscriptions").upsert({
          org_id:              orgId,
          stripe_sub_id:       subId,
          stripe_cust_id:      customerId,
          plan,
          status:              "active",
          current_period_end:  new Date(((fullSub as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString(),
          cancel_at_period_end: false,
        }, { onConflict: "org_id" });
        break;
      }

      // ── 구독 변경 (플랜 변경 / 갱신) ──────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription & { current_period_end: number };
        await handleSubscriptionChange(supabase, sub);
        break;
      }

      // ── 구독 해지 완료 → free 강등 ──────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("org_id")
          .eq("stripe_sub_id", sub.id)
          .single();

        if (existing?.org_id) {
          await supabase.from("subscriptions").update({
            plan:   "free",
            status: "canceled",
            stripe_sub_id: null,
          }).eq("stripe_sub_id", sub.id);
        }
        break;
      }

      // ── 결제 실패 → past_due ───────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        if (invoice.subscription) {
          await supabase.from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_sub_id", invoice.subscription);
        }
        break;
      }

      // ── 결제 성공 → active 복구 ───────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        if (invoice.subscription) {
          await supabase.from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_sub_id", invoice.subscription);
        }
        break;
      }

      default:
        // 처리하지 않는 이벤트 — 200 반환하여 Stripe 재전송 방지
        break;
    }
  } catch (err) {
    console.error(`Webhook 처리 오류 [${event.type}]:`, err);
    return errorResponse("WEBHOOK_HANDLER_FAILED", "Webhook handler failed", 500);
  }

  return successResponse({ received: true });
}

// ── 구독 상태 동기화 헬퍼 ─────────────────────────────────────
async function handleSubscriptionChange(
  supabase: ReturnType<typeof createServiceClient>,
  sub: Stripe.Subscription & { current_period_end: number }
) {
  const priceId = sub.items.data[0]?.price.id ?? "";
  const plan    = priceIdToPlan(priceId);

  await supabase.from("subscriptions").update({
    plan,
    status:              sub.status as string,
    current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
  }).eq("stripe_sub_id", sub.id);
}
