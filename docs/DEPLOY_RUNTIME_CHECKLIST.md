# Deploy Runtime Checklist

최종 업데이트: 2026-04-30

이 문서는 로컬 `.env.local` 과 현재 코드 기준으로, 운영 배포 전에 실제로 확인해야 할 런타임 의존성을 정리한 체크리스트입니다.

## 1. 로컬 기준 이미 존재하는 키

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NARA_API_KEY`
- `RESEND_API_KEY`
- `ALERT_FROM_EMAIL`

## 2. 로컬 기준 누락된 키

### 운영 blocker

- `ADMIN_CONSOLE_EMAILS`
  - `/settings/operations` 접근 allowlist에 필요
  - 없으면 운영 콘솔 접근 불가
- `NEXT_PUBLIC_APP_URL`
  - 초대 링크, 결제 리다이렉트 등 절대 URL 흐름에 필요

### 기능 blocker

- `AI_SERVICE_URL`
- `AI_SERVICE_API_KEY`
  - AI 예측/유사 공고/임베딩 배치 호출에 필요
  - 미설정 시 관련 API는 503 또는 비활성 상태
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`
  - 결제/업그레이드/포털/웹훅 전체에 필요
  - 미설정 시 Stripe 결제 기능 비활성

### 권장 보강

- `SUPABASE_URL`
  - 서버 런타임에서 `NEXT_PUBLIC_SUPABASE_URL` 보다 우선 사용됨
  - 코드상 fallback은 있지만, 배포 환경에서는 server-only runtime URL을 명시하는 편이 안전함

### 선택 사항

- `NARA_AWARD_API_KEY`
  - 낙찰 수집 전용 키
  - 없으면 `NARA_API_KEY` fallback 사용

## 3. 실제 운영 대시보드에서 확인할 항목

### Vercel

- `ADMIN_CONSOLE_EMAILS` 에 실제 운영자 이메일이 쉼표 구분으로 등록되어 있는지 확인
- `NEXT_PUBLIC_APP_URL` 이 실제 도메인과 일치하는지 확인
- Stripe 관련 5개 키가 모두 Production에 등록되어 있는지 확인
- AI service 관련 2개 키가 모두 Production에 등록되어 있는지 확인
- `SUPABASE_URL` 을 Production/Preview 에 server-only 값으로 등록했는지 확인

### Stripe

- Product / Price 가 실제 운영 금액으로 생성되어 있는지 확인
- Webhook endpoint 가 `/api/billing/webhook` 으로 등록되어 있는지 확인
- Customer Portal 이 활성화되어 있는지 확인

### Railway 또는 AI 서비스 배포 환경

- `bid-ai-service` 가 배포되어 있고 헬스 체크가 통과하는지 확인
- `AI_SERVICE_API_KEY` 가 웹앱과 AI 서비스 양쪽에서 일치하는지 확인

## 4. 현재 코드 기준 메모

- 운영 콘솔은 조직 `admin` 이면서 `ADMIN_CONSOLE_EMAILS` allowlist에 포함된 계정만 접근 가능
- `NARA_AWARD_API_KEY` 는 선택 항목이며, 없으면 `NARA_API_KEY` 를 fallback 사용
- Stripe 는 환경변수 미설정 시 의도적으로 비활성화됨
- AI 관련 route 는 `AI_SERVICE_URL` 이 없으면 정상 동작하지 않음

## 5. 여기서 바로 할 수 없는 것

- 실제 Vercel Production 환경 변수 값 검증
- 실제 Stripe Dashboard 설정 검증
- 실제 Railway 배포 상태 검증

위 세 항목은 외부 대시보드 접근 권한이 있어야 완료할 수 있습니다.

## 6. 운영 검증 1분 순서서

배포 직후 아래 순서대로만 확인하면 됩니다.

### 1단계. 운영 콘솔 계정 확인

- Vercel Production 환경 변수에서 `ADMIN_CONSOLE_EMAILS` 값을 확인
- 실제 운영자 이메일이 포함되어 있는지 확인
- 누락되어 있으면 저장 후 재배포

예상 결과:

- 운영자 이메일이 allowlist 에 포함되어 있다.

### 2단계. 운영 콘솔 접근 확인

- allowlist 에 포함된 조직 `admin` 계정으로 로그인
- `/settings/operations` 접속
- 운영 콘솔 화면이 열리고, `/settings` 로 리다이렉트되지 않는지 확인

예상 결과:

- 수집 상태, 최근 로그, 수동 실행 액션이 보인다.

### 3단계. 결제 업그레이드 흐름 확인

- 조직이 연결된 계정으로 로그인
- `/settings/billing` 접속
- Free 플랜이면 업그레이드 버튼 클릭
- Stripe Checkout 으로 이동되는지 확인

예상 결과:

- `/pricing` 이 아닌 Stripe Checkout 으로 이동된다.
- 결제 후 돌아오면 `/settings/billing?success=true` 흐름이 동작한다.

### 4단계. Stripe 포털 확인

- 이미 Stripe 고객이 생성된 계정에서 `/settings/billing` 접속
- `결제 수단 변경 · 구독 관리` 버튼 클릭
- Stripe Customer Portal 로 이동되는지 확인

예상 결과:

- 포털 세션이 정상 생성되고, 다시 앱으로 복귀할 수 있다.

### 실패 시 바로 볼 위치

- 운영 콘솔 접근 실패: `ADMIN_CONSOLE_EMAILS`, 조직 역할(`admin`) 확인
- Checkout 실패: Stripe 환경 변수 5개, `NEXT_PUBLIC_APP_URL`, 조직 연결 상태 확인
- Portal 실패: `subscriptions.stripe_cust_id` 존재 여부와 Stripe Portal 활성화 확인