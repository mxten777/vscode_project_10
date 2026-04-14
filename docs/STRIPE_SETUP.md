# Stripe 설정 TODO (2026-04-04 보류)

## 현황
- Stripe 결제 코드는 모두 완성됨 (Phase 12 + 16)
- 환경변수 미등록 상태 → 결제 기능 비활성
- 완료되면 `/pricing`, `/settings/billing` 페이지 완전 동작

## 해야 할 작업 (순서대로)

### 1. Stripe 상품 생성
- URL: https://dashboard.stripe.com/products
- Pro: 49,000 KRW / 월 → Price ID 복사
- Enterprise: 199,000 KRW / 월 → Price ID 복사

### 2. Stripe API 키 확인
- URL: https://dashboard.stripe.com/apikeys
- Publishable key (pk_live_...)
- Secret key (sk_live_...)

### 3. Webhook 엔드포인트 등록
- URL: https://dashboard.stripe.com/webhooks
- Endpoint: https://bid-platform.vercel.app/api/billing/webhook
- 이벤트 5개:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.paid
  - invoice.payment_failed
- Signing Secret (whsec_...) 복사

### 4. Customer Portal 활성화
- URL: https://dashboard.stripe.com/settings/billing/portal
- Cancel subscriptions, Update payment methods, View billing history 체크

### 5. Vercel 환경변수 등록 (6개)
- URL: https://vercel.com → bid-platform → Settings → Environment Variables
- STRIPE_SECRET_KEY = sk_live_...
- STRIPE_WEBHOOK_SECRET = whsec_...
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
- STRIPE_PRICE_PRO_MONTHLY = price_... (Pro)
- STRIPE_PRICE_ENTERPRISE_MONTHLY = price_... (Enterprise)

### 6. Vercel 재배포
- git push 또는 Vercel 대시보드에서 Redeploy

### 7. 검증
- /pricing 페이지 → Pro 플랜 결제 테스트
- /settings/billing 페이지 → 플랜 활성 확인
