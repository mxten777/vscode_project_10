# AI 입찰·조달 분석 플랫폼 — 프로젝트 현황 보고서

> 최초 작성: 2026-02-27 / 최종 업데이트: 2026-04-03  
> 프로젝트: bid-platform  
> 버전: 1.0.0

---

## 1. 프로젝트 개요

나라장터(조달청) 입찰 공고를 자동 수집·분석하여 맞춤 알림을 제공하는 SaaS 플랫폼.

| 항목 | 값 |
|------|-----|
| 프로덕션 URL | https://bid-platform.vercel.app |
| GitHub | https://github.com/mxten777/vscode_project_10 |
| Supabase | `pdxjwpskwiinustgzhmb` (Seoul 리전) |
| 기술 스택 | Next.js 16.1.6, React 19, TypeScript, Tailwind CSS v4 |
| UI 라이브러리 | shadcn/ui (Radix UI) + recharts |
| DB/Auth | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel (Hobby Plan, icn1 Seoul 리전) |
| 총 커밋 | 37개 |

---

## 2. 완료된 작업

### Phase 0: 프로젝트 초기 설정
- [x] Next.js 16 + TypeScript + Tailwind CSS v4 프로젝트 생성
- [x] shadcn/ui 컴포넌트 설치 (20+ 컴포넌트)
- [x] ESLint, PostCSS 설정
- [x] 프로젝트 구조 설계 및 문서화 (10+ 문서)

### Phase 1: Supabase 연동
- [x] Supabase 프로젝트 생성 (Seoul 리전)
- [x] DB 스키마 배포 (8개 테이블: orgs, org_members, agencies, tenders, awards, favorites, alert_rules, alert_logs)
- [x] RLS(Row Level Security) 정책 설정
- [x] 인덱스 생성 (트리그램 검색 포함)
- [x] 트리거 설정 (updated_at 자동 갱신)
- [x] Supabase Auth 설정 (이메일/비밀번호)
- [x] 테스트 사용자 생성 및 로그인 검증
- [x] 테스트 데이터 삽입 (org, org_member, agency, tender)

### Phase 2: API 개발 (19개 엔드포인트)
| 카테고리 | 엔드포인트 | 설명 |
|----------|-----------|------|
| Auth | `/api/auth/signin` | 로그인 |
| Auth | `/api/auth/signup` | 회원가입 + org/org_member 자동 생성 |
| Auth | `/api/auth/signout` | 로그아웃 |
| Tenders | `/api/tenders` | 공고 목록 (필터/페이징) |
| Tenders | `/api/tenders/[id]` | 공고 상세 |
| Favorites | `/api/favorites` | 즐겨찾기 목록 |
| Favorites | `/api/favorites/[tenderId]` | 즐겨찾기 추가/삭제 |
| Alerts | `/api/alerts/rules` | 알림 규칙 CRUD |
| Alerts | `/api/alerts/rules/[id]` | 알림 규칙 상세/수정/삭제 |
| Alerts | `/api/alerts/logs` | 알림 발송 로그 |
| Reports | `/api/reports/summary` | 리포트 집계 |
| Jobs | `/api/jobs/poll-tenders` | 나라장터 API 폴링 (Cron, 평일 09:00 UTC) |
| Jobs | `/api/jobs/process-alerts` | 알림 처리 (Cron, 평일 09:30 UTC) |
| Health | `/api/health` | 헬스체크 |

### Phase 3: 프론트엔드 페이지
- [x] 로그인 페이지 (`/login`) — 분할 레이아웃(히어로 패널)
- [x] 대시보드/공고 목록 (`/`) — 카테고리 칩, 트렌딩 키워드, 통계 카드
- [x] 공고 상세 (`/tenders/[id]`)
- [x] 즐겨찾기 (`/favorites`)
- [x] 알림 관리 (`/alerts`)
- [x] 리포트 (`/reports`) — PieChart, BarChart (recharts)
- [x] 공통 헤더/네비게이션 — glassmorphism, 아바타 드롭다운, 다크모드 토글
- [x] AuthContext (인증 상태 관리)
- [x] React Query 기반 데이터 패칭

### Phase 4: 외부 API 연동
- [x] 나라장터(공공데이터포털) API 키 발급 (2개 서비스 승인)
  - Encoding Key: `w%2FP304CJjlu5%2F...`
  - Decoding Key: `64bb283bc6fb4e5b...`
- [x] poll-tenders API 구현 (재시도/백오프 로직 포함)
- [x] process-alerts API 구현 (키워드/필터 매칭 + 알림 발송)

### Phase 5: 초기 배포
- [x] Git 초기화 및 GitHub 푸시 (78 파일, 16,333줄)
- [x] Vercel 프로젝트 생성 (`bid-platform`)
- [x] 환경 변수 7개 등록 (newline 이슈 해결)
- [x] Resend lazy-init 수정 (API 키 미설정 시 빌드 오류 해결)
- [x] Cron 스케줄 조정 (`0 9 * * 1-5` — 평일 09:00 UTC, Hobby 플랜 제한 대응)
- [x] 프로덕션 배포 성공 + Health Check 확인
- [x] Supabase Auth URL 설정 (Site URL + Redirect URL)
- [x] 불필요한 `vscode-project-10` Vercel 프로젝트 삭제

### Phase 6: UI/UX 전면 개편 (Premium)
- [x] Indigo 브랜드 컬러 + 다크 모드 지원 (`next-themes`)
- [x] Glassmorphism 헤더 (아바타 드롭다운, 비밀번호 변경 다이얼로그)
- [x] 로그인 페이지 분할 레이아웃 (히어로 패널)
- [x] 대시보드 통계 카드, 페이드업/스태거 애니메이션
- [x] Mesh gradient 배경, 카드 hover 마이크로 애니메이션
- [x] 리포트 페이지 recharts 차트 (PieChart, BarChart)
- [x] 반응형 모바일 네비게이션 (애니메이션)
- [x] 빈 상태(Empty State) 일러스트 개선
- [x] 로그아웃 시 전체 페이지 리로드 (캐시 상태 초기화)
- [x] 데모 데이터 시드 스크립트 (`scripts/seed-demo.mjs`)

### Phase 7: 코드 품질·보안 강화
- [x] `middleware.ts` → `proxy.ts` 리네임 (Next.js 16 컨벤션)
- [x] 중복 `middleware.ts` 파일 제거 (빌드 오류 해결)
- [x] 하드코딩된 Supabase Service Key 제거 → 환경변수 전환 (보안)
- [x] `command.tsx` 미사용 컴포넌트 제거
- [x] `sleep` 헬퍼 내부 전용으로 unexport
- [x] alert_logs 중복 알림 방지 UNIQUE 제약 추가 (DB Migration 001)
- [x] alert_rules `name` 컬럼 추가 (Migration 001)
- [x] tenders/alert_logs 쿼리 최적화 인덱스 추가 (Migration 001)
- [x] batch upsert 최적화 (기관 1회 쿼리, 공고 1회 쿼리)
- [x] TOCTOU 경쟁 조건 수정
- [x] `raw_json`/에러 메시지 마스킹 (정보 노출 방지)
- [x] CRON_SECRET 미설정 시 서비스 시작 거부 가드 추가

### Phase 8: 나라장터 API 연동 안정화
- [x] 조달청 운영계정 API endpoint로 전환 (`/ad/BidPublicInfoService/getBidPblancListInfoServc`)
- [x] Vercel 서버리스 함수 Seoul 리전(icn1) 고정 (한국 IP 요건 충족)
- [x] API 키 `.trim()` 처리 (Vercel 환경변수 줄바꿈 방지)
- [x] 날짜 형식 수정 (12자리 `YYYYMMDDHHMMSS`)
- [x] URL 인코딩 이중 인코딩 버그 수정
- [x] PostgreSQL upsert 중복 페이로드 중복 제거 수정
- [x] 에러 직렬화 개선 (Error 객체 JSON 변환)
- [x] 디버그 코드 완전 제거 (프로덕션 정리)

### Phase 8: org 자동 생성
- [x] 회원가입 시 org + org_member(admin) 자동 생성 완료
  - 즐겨찾기, 알림 규칙 등 RLS 의존 기능 정상 작동

### Phase 9: 낙찰 분석 대시보드 (2026-03-14)
- [x] Migration 006 ~ 009 Supabase 적용 완료
  - 006: `bid_notices`, `bid_open_results`, `bid_awards` 테이블
  - 007: FK 제약, `calculate_avg_bid_rate` 함수, RLS 쓰기 정책
  - 008: `bid_price_features` 트리거
  - 009: `recommend_bid_price()` v2 (`lower_limit_rate` 클램핑)
- [x] `/api/jobs/collect-bid-awards` 크론 구현 (나라장터 개찰결과 수집)
- [x] bid-analysis API 3개 RLS 버그 수정: `createClient()` → `createServiceClient()`
  - `/api/bid-analysis/stats`, `/api/bid-analysis/recommend`, `/api/bid-analysis/similar`
- [x] 데모 시드 데이터 60건 삽입 (`scripts/seed-bid-awards.sql`)
  - 3개 테이블 × 60행, 최근 12개월 균등 분산
- [x] 낙찰 분석 대시보드 (`/analytics`) 완전 작동 확인
  - KPI 카드: 69건, 91.56%, ₩370B, 15개 기관 (12개월 기준)
  - 월별 트렌드 LineChart (Recharts ResponsiveContainer Tabs 버그 수정)
  - 기관별/업종별/지역별 Top10 BarChart
- [x] 월 레이블 포맷 개선: `"2025-03"` → `"'25.03"` (연도 중복 방지)

### Phase 10: 코드 품질 정비 (2026-03-24)
- [x] 미사용 패키지 3개 제거: `react-hook-form`, `@hookform/resolvers`, `date-fns`
  - 소스 코드 어디에도 임포트되지 않아 번들에서 제거
- [x] `header.tsx` `createClient()` 렌더 바디 → `useRef` 메모이제이션 (매 렌더 클라이언트 재생성 방지)
- [x] `(app)/layout.tsx` footer `<span>` → `<a>` 접근성 수정 (이용약관/개인정보/문의)
- [x] 기술부채 전수 분석 완료 (17개 항목 식별, 우선순위 분류)

### Phase 11: 보안/안정성 강화 (2026-04-03)
- [x] `src/middleware.ts` → Upstash Redis 슬라이딩윈도우 Rate Limiter 구현
  - auth 엔드포인트: 10회/5분, api 엔드포인트: 60회/1분
  - 환경변수 미설정 시 graceful skip (graceful degradation)
- [x] `next.config.ts` → Security Headers 8종 적용
  - CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy 등
- [x] `.env.example` → 전체 환경변수 목록 정비 + AI Service 변수 추가

### Phase 12: 수익화 기반 — Stripe 결제 (2026-04-03)
- [x] `src/lib/stripe.ts` — Stripe 싱글톤 + `STRIPE_PRICES` + `priceIdToPlan()` 헬퍼
- [x] `src/app/api/billing/checkout/route.ts` — Stripe Checkout Session 생성 (POST)
- [x] `src/app/api/billing/webhook/route.ts` — 5가지 Stripe 이벤트 처리 (runtime=nodejs)
  - `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid/payment_failed`
- [x] `src/app/pricing/page.tsx` — Free/Pro/Enterprise 3단 요금제 UI
- [x] `src/components/upgrade-modal.tsx` — 플랜 한도 초과 시 업그레이드 유도 모달
- [x] `src/hooks/use-export-pdf.ts` — jspdf + html2canvas DOM→A4 다중페이지 PDF 내보내기 훅
- [x] Supabase Migration 013: `subscriptions` 테이블 + plan 동기화 트리거 + `org_invitations` 테이블

### Phase 13: DB 최적화 + 인프라 보강 (2026-04-03)
- [x] Migration 012: `collection_logs` 수집이력 테이블 + RLS + 90일 자동 cleanup
- [x] Migration 014: `awards` 1:N 구조 개선 (UNIQUE 제약 → 복합 UNIQUE)
- [x] Migration 015: 복합 인덱스 8개 추가 (PARTIAL 인덱스 포함)
- [x] Migration 016: `cleanup_old_alert_logs()`, `cleanup_old_collection_logs()`, `run_cleanup_jobs()` RPC
- [x] Migration 017: `reports` 저장 테이블 + RLS + Storage 버킷 안내
- [x] `src/app/api/jobs/poll-tenders/route.ts` — 50페이지 루프 + collection_logs 수집이력 기록
- [x] `src/app/api/jobs/collect-bid-awards/route.ts` — KST +09:00 시간대 버그 수정 + collection_logs
- [x] `src/app/api/jobs/cleanup/route.ts` — `run_cleanup_jobs()` RPC 호출 Cron
- [x] `vercel.json` — cleanup(일요일 01:00), embed-batch(월요일 02:00) Cron 추가 (총 5개)

### Phase 14: AI 실체화 — FastAPI + pgvector (2026-04-03)
- [x] `bid-ai-service/` Python FastAPI 프로젝트 신규 생성 (Railway 배포용)
  - `app/models/bid_rate_predictor.py` — GradientBoosting(300 estimators, 5-fold CV), `predict()` 3전략 반환
  - `app/models/embedder.py` — `paraphrase-multilingual-MiniLM-L12-v2` (768d)
  - `app/routers/` — `/health`, `/predict/bid-rate`, `/predict/embed/batch`, `/train/bid-rate`
  - `Dockerfile` — CPU-only PyTorch + 모델 pre-download
  - `railway.toml` — Railway 배포 설정
- [x] Migration 018: `pgvector` 확장 + `title_embedding vector(768)` 컬럼 + `search_similar_tenders()` RPC
- [x] `src/app/api/ai/predict/route.ts` — bid-ai-service `/predict/bid-rate` 프록시
- [x] `src/app/api/ai/similar/route.ts` — 임베딩 생성 → pgvector `search_similar_tenders` RPC
- [x] `src/app/api/ai/embed-batch/route.ts` — 미임베딩 공고 200건 배치 처리 Cron
- [x] `.github/workflows/retrain-model.yml` — 월 1일 UTC 02:00 자동 모델 재학습 GitHub Actions

### Phase 15: 팀 초대 + SEO + 버그수정 (2026-04-03)
- [x] KST 시간대 버그 수정: `T${h}:${m}:${s}Z` → `T${h}:${m}:${s}+09:00` (9시간 오차 해소)
- [x] `src/app/api/auth/signin/route.ts` — `signInSchema.safeParse()` Zod 입력 검증 적용
- [x] SEO 메타태그 적용
  - `src/app/(app)/analytics/layout.tsx` — 낙찰 분석 metadata
  - `src/app/login/layout.tsx` — 로그인 metadata + `robots: noindex`
  - `src/app/(app)/tenders/[id]/layout.tsx` — `generateMetadata` 공고명 동적 title
- [x] 팀 초대 기능 전체 구현
  - `src/app/api/team/invite/route.ts` — GET(초대목록) / POST(초대발송 + Resend 이메일)
  - `src/app/api/team/invite/[id]/route.ts` — DELETE 초대 취소
  - `src/app/api/team/members/route.ts` — GET 멤버 목록 + 이메일 보강
  - `src/app/api/team/accept/route.ts` — POST 토큰 검증 + `org_members` 추가
  - `src/app/(app)/team/page.tsx` — 팀 관리 UI (초대 발송, 멤버 목록, 초대 취소)
  - `src/app/(app)/team/layout.tsx` — 팀 관리 metadata
  - `src/app/invite/accept/page.tsx` — 초대 수락 페이지 (loading / login_required / success / error)
  - `src/app/invite/accept/layout.tsx` — Suspense 래퍼 + metadata
- [x] `src/components/header.tsx` — 팀 관리 nav 항목 + Users 아이콘 추가
- [x] `get_errors` 전체 검증 → `bid-platform/src` No errors found ✅

---

## 3. 해결된 이슈 전체 목록

| 이슈 | 원인 | 해결 |
|------|------|------|
| 환경변수 newline | PowerShell 파이프 자동 줄바꿈 | Node.js `execSync` + `input` 옵션으로 재등록 |
| Resend 빌드 오류 | `new Resend()` 모듈 로드 시 즉시 실행 | 지연 초기화(lazy-init) + null guard |
| Cron 배포 실패 | Hobby 플랜 일 1회 제한 | `*/10 * * * *` → `0 9 * * 1-5` 변경 |
| 잘못된 Vercel 프로젝트 | 상위 폴더에서 첫 배포 실행 | `bid-platform/` 디렉토리에서 재배포 |
| 나라장터 API 500 | 개발계정 endpoint 사용 | 운영계정 endpoint로 전환 |
| 나라장터 API 한국 IP 차단 | Vercel 기본 리전(미국) | `preferredRegion = "icn1"` 설정 |
| API 키 오류 | Vercel 환경변수에 줄바꿈 포함 | `.trim()` 처리 |
| 날짜 파라미터 오류 | 날짜 형식 불일치 | `YYYYMMDDHHMMSS` 12자리로 수정 |
| URL 이중 인코딩 | serviceKey를 fetch URL에 다시 인코딩 | raw key를 URL에 직접 삽입 |
| DB upsert 충돌 | 동일 source_tender_id 중복 페이로드 | Map으로 중복 제거 후 upsert |
| 빌드 오류 (middleware) | middleware.ts + proxy.ts 중복 존재 | middleware.ts 삭제 |
| 보안 — 키 하드코딩 | seed 스크립트에 Service Key 노출 | 환경변수(`SUPABASE_SERVICE_ROLE_KEY`) 전환 |
| 로그아웃 후 상태 잔류 | React Query 캐시 미초기화 | `window.location.href` 풀 리로드 |
| RLS 기능 불가 | 회원가입 시 org 미생성 | signup API에 org + org_member 자동 생성 추가 |
| KST 9시간 오차 | `T${h}:${m}:${s}Z` (UTC) 잘못 조합 | `+09:00` 오프셋으로 수정 |
| Rate Limiter 무효 | 인메모리 Map은 서버리스에서 인스턴스별 독립 | Upstash Redis 슬라이딩윈도우로 교체 |
| Stripe webhook 타입 오류 | Stripe SDK 타입 불일치 | `(fullSub as unknown as {...})` 이중 캐스팅 |
| team/invite GET 컴파일 경고 | 미사용 Request 파라미터 | `GET()` 파라미터 제거 |
| accept/page.tsx hoisting 오류 | 함수 사용 전 선언 위치 문제 | 함수 선언 순서 조정 + eslint-disable |
| Stripe 빌드 오류 | `stripe.ts` 모듈 로드 시 `throw` 즉시 실행 | lazy-init (`getStripe()` 함수) + Proxy 패턴으로 해소 |
| team/page.tsx 타입 오류 | 미사용 Separator import | import 제거 |

---

## 4. 현재 인프라 구성

```
┌─────────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   Vercel (Hobby)    │    │  Supabase        │    │ 나라장터 API       │
│   리전: icn1 (Seoul)│    │  (Seoul, Free)   │    │ (data.go.kr)      │
│                     │    │                  │    │                    │
│ ├ Next.js App       │◄──►│ ├ PostgreSQL 16  │◄───│ ├ 입찰공고목록조회  │
│ ├ API Routes (30+)  │    │ ├ Auth (GoTrue)  │    │ └ 개찰결과조회      │
│ ├ Cron Jobs (5)     │───►│ ├ RLS (전 테이블)│    │                    │
│ │  ├ 평일 00:00 UTC │    │ ├ 18 Migrations  │    │  ✅ 운영계정 연동   │
│ │  ├ 평일 00:10 UTC │    │ ├ pgvector(768d) │    │                    │
│ │  ├ 평일 00:30 UTC │    │ └ 10+ RPCs/Funcs│    │                    │
│ │  ├ 일요일 01:00   │    │                  │    │                    │
│ │  └ 월요일 02:00   │    └──────────────────┘    └────────────────────┘
│ ├ Upstash Redis     │
│ │  (Rate Limiting)  │    ┌──────────────────┐    ┌────────────────────┐
│ └ Static Pages (8)  │    │  bid-ai-service  │    │  Stripe            │
└─────────────────────┘    │  (Railway)       │    │  (결제)            │
        │                  │                  │    │                    │
        │                  │ ├ FastAPI         │    │ ├ Checkout Session │
        │   GitHub         │ ├ GradientBoost  │    │ ├ Webhook          │
        └──► mxten777/     │ └ MiniLM-L12-v2  │    │ └ Subscription     │
             vscode_       └──────────────────┘    └────────────────────┘
             project_10
             (master)
```

### Vercel 환경 변수 (Production)

| 변수명 | 용도 | 상태 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 등록 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 | ✅ 등록 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 | ✅ 등록 |
| `CRON_SECRET` | Cron Job 인증 | ✅ 등록 |
| `NARA_API_KEY` | 나라장터 API 키 (Encoding) | ✅ 등록 |
| `NARA_API_BASE_URL` | 나라장터 API 베이스 URL | ✅ 등록 |
| `NEXT_PUBLIC_APP_URL` | 앱 프로덕션 URL | ✅ 등록 |
| `RESEND_API_KEY` | 이메일 알림 (Resend) | ⚠️ 미등록 (이메일 발송 비활성) |
| `ALERT_FROM_EMAIL` | 발신자 주소 | ⚠️ 미등록 (기본값 `noreply@bidplatform.com`) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis Rate Limiter | ⚠️ 미등록 (Rate Limit 비활성) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis 인증 토큰 | ⚠️ 미등록 |
| `STRIPE_SECRET_KEY` | Stripe 결제 서버 키 | ⚠️ 미등록 (결제 비활성) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 서명 검증 | ⚠️ 미등록 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 공개 키 | ⚠️ 미등록 |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro 플랜 Price ID | ⚠️ 미등록 |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Enterprise 플랜 Price ID | ⚠️ 미등록 |
| `AI_SERVICE_URL` | bid-ai-service Railway URL | ⚠️ 미등록 (AI 기능 비활성) |
| `AI_SERVICE_API_KEY` | bid-ai-service 인증 키 | ⚠️ 미등록 |

### Git 커밋 이력 (최신 10개)

```
[2026-04-03] feat: Phase 15 — team invite, SEO metadata, Zod validation, KST fix
[2026-04-03] feat: Phase 14 — bid-ai-service FastAPI + pgvector migration 018
[2026-04-03] feat: Phase 13 — DB migrations 012-017, cleanup cron, collection logs
[2026-04-03] feat: Phase 12 — Stripe billing (checkout, webhook, pricing UI)
[2026-04-03] feat: Phase 11 — Upstash Rate Limiter + Security Headers
d2698f1 chore: remove unused deps + fix header createClient memoization + fix footer a11y
e992369 fix: wrap ResponsiveContainer in explicit height div to fix Tabs rendering bug
6dab5b0 fix: bid-analysis API use service client to bypass RLS
[seed]   scripts/seed-bid-awards.sql 추가 (60건 데모 데이터)
2215402 chore: remove debug code from poll-tenders
```

---

## 5. 남은 작업 목록

### � 즉시 필요 (배포 전 인프라 설정)

> 코드는 모두 완성됨. 아래는 콘솔/대시보드에서 사람이 직접 수행해야 하는 작업.

| # | 작업 | 설명 |
|---|------|------|
| 1 | ~~**Supabase Migration 012~018 실행**~~ | ✅ 2026-04-03 완료 |
| 2 | **Vercel 환경변수 등록** | UPSTASH, STRIPE, AI_SERVICE 변수들 (위 표 참고) |
| 3 | **Stripe 상품/가격 생성** | Pro ₩49,000/월, Enterprise ₩199,000/월 → Price ID 복사 등록 |
| 4 | **Stripe Webhook 등록** | `https://bid-platform.vercel.app/api/billing/webhook` |
| 5 | **Railway bid-ai-service 배포** | `bid-ai-service/` 디렉토리 연결 → 환경변수 설정 → `POST /train/bid-rate` 초기 학습 |

### 🟡 중요 (기능 완성)

| # | 작업 | 설명 | 난이도 |
|---|------|------|--------|
| 6 | **Resend API 키 발급 + 도메인 인증** | https://resend.com 가입 → API Key 발급 → Vercel `RESEND_API_KEY` 등록 → 도메인 DNS(SPF/DKIM) 인증 → `ALERT_FROM_EMAIL` 등록 | 낮음 |
| 7 | **Cron Job 실제 수집 확인** | 나라장터 데이터가 DB에 실제로 적재되는지 확인. `curl -X POST https://bid-platform.vercel.app/api/jobs/poll-tenders -H "Authorization: Bearer {CRON_SECRET}"` | 낮음 |
| 8 | **전체 사용자 플로우 테스트** | 회원가입 → 로그인 → 공고 조회 → 즐겨찾기 → 알림 규칙 생성 → 리포트 차트 → 팀 초대 | 중간 |
| 9 | **GitHub Actions Secrets 등록** | `AI_SERVICE_URL`, `AI_SERVICE_API_KEY`, `NEXT_APP_URL`, `CRON_SECRET` | 낮음 |

### 🟢 개선 (품질 향상)

| # | 작업 | 설명 | 난이도 |
|---|------|------|--------|
| 10 | **반응형 디자인 최종 검증** | 모바일/태블릿 레이아웃 전 페이지 테스트 | 중간 |
| 11 | **공고 상세 페이지 강화** | 유사 공고 추천 UI 연결 (API는 완성, 프론트 미연결) | 중간 |
| 12 | **signup Zod 검증 적용** | `signup/route.ts`에 `signUpSchema` 연결 (signin은 완료) | 낮음 |

### 🔵 고도화 (로드맵)

| # | 작업 | 설명 |
|---|------|------|
| 13 | **배치 파이프라인 고도화** | QStash/Redis 기반 비동기 큐, 데드레터큐 |
| 14 | **검색 고도화** | OpenSearch + Nori 한국어 형태소 분석기 |
| 15 | **Kakao 알림톡 실발송** | Provider 인터페이스 준비됨, Kakao 비즈메시지 API 연동 필요 |
| 16 | **모니터링** | Sentry 에러 트래킹 + Upstash Monitor |
| 17 | **Vercel Pro 업그레이드** | Cron 10분 간격 복원, 더 빠른 빌드, 분석 기능 |

---

## 6. 재배포 방법

### 코드 수정 후 자동 배포 (권장)
```bash
cd bid-platform
git add .
git commit -m "feat: 변경 내용 설명"
git push origin master
# → Vercel이 자동으로 빌드 & 배포
```

### 수동 배포 (CLI)
```bash
cd bid-platform
vercel --prod --yes
```

### 환경 변수 수정
```bash
# 삭제
vercel env rm 변수명 production --yes

# 추가 (cmd 경유로 newline 방지)
cmd /c "echo|set /p=값| vercel env add 변수명 production"

# 또는 Node.js 스크립트 사용
node -e "require('child_process').execSync('vercel env add 변수명 production', {input: '값'})"
```

---

## 7. 다음 세션 시작 방법

새 대화창에서 아래 문장을 그대로 붙여넣으면 됩니다:

```
PROJECT_STATUS.md와 SESSION_LOG_20260324.md를 읽고 현재 상태를 파악한 뒤, 남은 작업 목록에서 이어서 작업해줘.
```

또는 특정 작업을 바로 시작하려면:
```
PROJECT_STATUS.md를 읽고, [작업 내용]을 구현해줘.
예) "Resend 이메일 연동 완료 및 도메인 인증 설정 가이드 작성"
예) "KST 시간대 버그 수정"
예) "auth 라우트에 Zod 검증 적용"
```

---

## 8. 주요 접속 정보

| 서비스 | URL |
|--------|-----|
| 프로덕션 사이트 | https://bid-platform.vercel.app |
| Vercel Dashboard | https://vercel.com/dongyeol-jungs-projects/bid-platform |
| Supabase Dashboard | https://supabase.com/dashboard/project/pdxjwpskwiinustgzhmb |
| GitHub Repository | https://github.com/mxten777/vscode_project_10 |
| 공공데이터포털 | https://www.data.go.kr/mypage/main.do |
| Health Check | https://bid-platform.vercel.app/api/health |
