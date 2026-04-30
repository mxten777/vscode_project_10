# Start Here

이 프로젝트를 처음 여는 사람이 가장 먼저 봐야 하는 문서입니다.

## 한 줄 설명

BidSight는 나라장터 공고를 수집해서 검색, 즐겨찾기, 알림, 낙찰 분석을 제공하는 B2B 입찰 지원 SaaS입니다.

## 지금 실제로 돌아가는 것

- 웹앱: Next.js 기반 사용자 앱
- 공고 검색/필터/상세 조회
- 즐겨찾기
- 알림 규칙과 이메일 발송
- 분석 대시보드와 리포트
- Cron 기반 데이터 수집 오케스트레이션

## 코드에 있지만 운영상 아직 덜 닫힌 것

- AI 추천 기능: 별도 `bid-ai-service` 배포와 환경변수 정리 필요
- Stripe 결제: 운영 환경변수와 결제 설정 필요
- 추가 자동화: 핵심 사용자 흐름과 주요 실패 흐름의 E2E는 확보됐고, 더 깊은 운영 시나리오는 선택 확장 영역

## 지금 먼저 봐야 하는 남은 과제

- 알림 채널 확장: 현재 실동작 채널은 이메일이며 Kakao/Slack 같은 운영 채널은 남아 있습니다.
- 리포트 export 후속 흐름: CSV/PDF는 있지만 서버 생성형 공유와 템플릿 고도화는 남아 있습니다.
- 핵심 API 회귀 확장: 주요 업무 경로는 검증 중이지만 tenders 검색, reports summary 쪽은 더 넓힐 수 있습니다.
- 운영 환경 최종 점검: `/settings/operations` 는 `ADMIN_CONSOLE_EMAILS` allowlist 기반으로 잠겼으므로 운영 계정/환경변수 확인이 필요합니다.

## 저장소 구조를 이렇게 보면 됩니다

### 1. 제품 관점

- `bid-platform`: 실제 사용자 웹앱과 API
- `bid-ai-service`: AI 예측/임베딩용 별도 FastAPI 서비스

### 2. 웹앱 안에서 중요한 경로

- `src/app/(app)`: 로그인 후 사용자 화면
- `src/app/api`: 웹앱이 직접 제공하는 API와 배치 라우트
- `src/lib`: 인증, 응답 포맷, 유효성 검사, Supabase 연동
- `src/__tests__`: Vitest 기반 API/유틸 테스트
- `tests/e2e`: Playwright 기반 사용자 회귀 테스트
- `supabase/migrations`: 실제 DB 변경 이력의 소스 오브 트루스

## 문서는 이 순서로 보면 됩니다

### 제품과 현재 상태를 빨리 파악하고 싶을 때

1. `README.md`
2. `docs/START_HERE.md`
3. `docs/READINESS_REPORT.md`
4. `docs/TECH_DEBT.md`
5. `docs/CLIENT_OVERVIEW.md`

### 구조와 런타임을 이해하고 싶을 때

1. `docs/ARCHITECTURE.md`
2. `docs/DATA_PIPELINE.md`
3. `docs/DEPLOYMENT_GUIDE.md`

### 기능과 사용자 화면을 이해하고 싶을 때

1. `docs/USER_MANUAL.md`
2. `docs/UI_DESIGN.md`
3. `docs/API_SPECIFICATION.md`

### DB와 운영을 확인하고 싶을 때

1. `supabase/migrations/*`
2. `docs/DATABASE_SCHEMA.md`
3. `docs/ADMIN_MANUAL.md`
4. `docs/TECH_DEBT.md`

### 과거 의사결정과 작업 로그가 필요할 때

1. `docs/archive/README.md`
2. `docs/archive/history/*`
3. `docs/archive/reports/*`

## 이 프로젝트를 5분 안에 설명하면

### 문제

공공 입찰 참여자는 나라장터 공고를 직접 뒤지며, 어떤 공고를 봐야 하는지와 어떤 가격 전략이 유리한지 빠르게 판단하기 어렵습니다.

### 해결

BidSight는 공고를 자동 수집하고, 조건 검색과 알림을 제공하며, 누적된 낙찰 데이터로 분석과 추천까지 붙이려는 제품입니다.

### 현재 단계

핵심 검색, 저장 검색, 알림, 리포트, cron 수집은 이미 제품 흐름으로 연결되어 있고, AI/결제/운영도구는 운영 마감 작업이 남아 있는 상태입니다.

## 현재 문서에서 특히 주의할 점

- 오래된 문서 중 일부는 현재 구현보다 낙관적이거나 범위가 넓게 적혀 있습니다.
- DB 기준은 `supabase/schema.sql` 하나가 아니라 `supabase/migrations/*` 입니다.
- 현재 상태 판단은 `docs/READINESS_REPORT.md`, 남은 우선순위 판단은 `docs/TECH_DEBT.md` 를 우선 기준으로 보는 편이 맞습니다.
- 과거 세션 로그, 테스트 스냅샷, 장기 상태 보고서는 `docs/archive/` 아래로 이동했습니다.