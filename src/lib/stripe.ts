import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY 환경변수가 설정되지 않았습니다.");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-03-31.basil",
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated getStripe() 사용 권장. 하위 호환용 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Stripe Price ID 매핑
 * Stripe 대시보드에서 상품/가격 생성 후 실제 Price ID로 교체
 */
export const STRIPE_PRICES = {
  pro_monthly:        process.env.STRIPE_PRICE_PRO_MONTHLY        ?? "",
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? "",
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRICES;

/**
 * Stripe Price ID → plan 이름 매핑
 */
export function priceIdToPlan(priceId: string): "pro" | "enterprise" | "free" {
  if (priceId === STRIPE_PRICES.pro_monthly)        return "pro";
  if (priceId === STRIPE_PRICES.enterprise_monthly) return "enterprise";
  return "free";
}
