# 프로젝트 개요 & 아키텍처 문서

> **AI 입찰·조달 분석 플랫폼 (MVP)**
> 나라장터(공공데이터포털) 입찰 공고를 자동 수집·분석하고, 사용자 맞춤 알림을 제공하는 SaaS 플랫폼

---

## 1. 프로젝트 개요

### 1.1 목적

공공 입찰 시장에 참여하는 기업·컨설턴트를 대상으로, 나라장터 공고를 자동 수집하여:
- **실시간 검색/필터** 기능 제공
- **맞춤 알림** (키워드·지역·업종·예산 조건)으로 기회를 놓치지 않도록 지원
- **통계 리포트** (기관·업종 TOP, 예산 합계, 상태 분포)를 통한 시장 분석
- **즐겨찾기** 기능으로 관심 공고 사후 관리

### 1.2 MVP 범위

| 기능 영역 | 포함 범위 | 미포함 (후속 확장) |
|---|---|---|
| 데이터 수집 | 나라장터 입찰공고 폴링 | 실시간 WebSocket 스트림 |
| 검색/필터 | 키워드(ilike), 상태, 지역, 업종, 예산 범위 | 전문 검색(Full-text), 유사도 |
| 알림 | 이메일(Resend), 카카오(Mock) | SMS, 슬랙, 웹훅 |
| 리포트 | 기간별 요약 통계 | AI 예측 분석, 차트 내보내기 |
| 인증 | 이메일+비밀번호, 단일 조직 | OAuth, MFA, 다중 조직 |

### 1.3 기술 스택

```
┌───────────────────────────────────┐
│           Frontend                │
│  Next.js 16 (App Router)         │
│  TailwindCSS v4 + shadcn/ui      │
│  TanStack Query v5               │
├───────────────────────────────────┤
│           Backend (API Routes)    │
│  Next.js Route Handlers          │
│  Zod v4 (입력 검증)               │
│  Supabase Auth + RLS             │
├───────────────────────────────────┤
│           Data Layer              │
│  Supabase (Postgres + Auth)      │
│  pg_trgm (트리그램 검색)          │
│  Service Role Client (Jobs)      │
├───────────────────────────────────┤
│           External                │
│  나라장터 API (공공데이터포털)     │
│  Resend (이메일 발송)             │
│  Vercel Cron (스케줄러)           │
└───────────────────────────────────┘
```

---

## 2. 시스템 아키텍처

### 2.1 전체 구성도

```
                              ┌─────────────┐
                              │  사용자 (웹) │
                              └──────┬──────┘
                                     │ HTTPS
                              ┌──────▼──────┐
                              │   Vercel     │
                              │  (CDN/Edge)  │
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
             ┌──────▼──────┐ ┌──────▼──────┐  ┌──────▼──────┐
             │  SSR Pages  │ │  API Routes │  │  Cron Jobs  │
             │  (App Dir)  │ │ /api/*      │  │ /api/jobs/* │
             └──────┬──────┘ └──────┬──────┘  └──────┬──────┘
                    │                │                │
                    │          ┌─────▼─────┐         │
                    │          │ Supabase  │         │
                    └─────────►│ Auth      │◄────────┘
                               │ + Postgres│
                               │ (RLS)     │
                               └─────┬─────┘
                                     │
                               ┌─────▼──────┐
                               │  나라장터   │
                               │  OpenAPI   │
                               └────────────┘
```

### 2.2 컴포넌트 간 통신

| 출발 | 도착 | 프로토콜 | 설명 |
|---|---|---|---|
| 브라우저 | Next.js SSR | HTTPS | 페이지 요청, CSR 라우팅 |
| 브라우저 | API Routes | HTTPS (fetch) | TanStack Query를 통한 REST 호출 |
| API Routes | Supabase | HTTPS (PostgREST) | 쿼리/뮤테이션 (anon key + RLS) |
| Cron Jobs | Supabase | HTTPS (PostgREST) | Service Role key (RLS 우회) |
| Cron Jobs | 나라장터 | HTTPS | 공고 폴링 (JSON) |
| Cron Jobs | Resend API | HTTPS | 알림 이메일 발송 |
| Middleware | Supabase Auth | HTTPS | 세션 검증 |

### 2.3 요청 흐름 (Request Flow)

#### 2.3.1 공고 목록 조회
```
사용자 → [TanStack Query] → GET /api/tenders?q=&status=&page=
  → Zod 파라미터 검증
  → Supabase SSR Client 생성 (cookie 기반)
  → countQuery + dataQuery 병렬 실행
  → PaginatedResponse 반환
```

#### 2.3.2 즐겨찾기 추가
```
사용자 → [useMutation] → POST /api/favorites/:tenderId
  → getAuthContext() (인증 + org 조회)
  → supabase.from("favorites").upsert(...) (중복 안전)
  → queryClient.invalidateQueries (캐시 갱신)
```

#### 2.3.3 Cron: 공고 수집
```
Vercel Cron (평일 09:00 UTC — Hobby 플랜 1일 1회)
  → POST /api/jobs/poll-tenders (Authorization: Bearer CRON_SECRET)
  → verifyCronSecret 검증
  → 나라장터 API 호출 (retryWithBackoff, 3회 재시도)
  → 각 공고: 기관 upsert → 공고 upsert (source_tender_id 기준)
  → 결과 통계 반환 { inserted, updated, errors }
```

#### 2.3.4 Cron: 알림 처리
```
Vercel Cron (평일 09:30 UTC — Hobby 플랜 1일 1회)
  → POST /api/jobs/process-alerts
  → 활성 alert_rules 전체 조회
  → 최근 2시간 내 신규 공고 조회 (Vercel Hobby 플랜 대응)
  → 각 규칙 × 각 공고 매칭 (keyword, region, industry, budget)
  → 중복 발송 방지 (alert_logs 확인)
  → 이메일/카카오 발송 + alert_logs 기록
```

---

## 3. 설계 원칙 (Design Principles)

### 3.1 API-First 설계
모든 비즈니스 로직은 `/api/*` Route Handlers에 집중. 프론트엔드는 순수한 API 소비자로 동작하여, 향후 모바일 앱·외부 연동 시 API 재사용 가능.

### 3.2 Upsert / 멱등성 (Idempotency)
- 공고 수집: `source_tender_id` UNIQUE 제약 → 중복 수집 시에도 안전한 upsert
- 기관 등록: `code` UNIQUE 제약 → 동일 기관 중복 생성 방지
- 즐겨찾기: `(user_id, tender_id)` UNIQUE → upsert로 중복 토글 안전
- 알림 발송: `(alert_rule_id, tender_id)` 체크 → 동일 알림 재발송 방지

### 3.3 Postgres-First 접근
- 검색: `pg_trgm` GIN 인덱스로 LIKE 쿼리 가속 (별도 검색 엔진 불필요)
- 집계: SQL 레벨에서 count/aggregate 처리 (MVP 단계)
- RLS: Postgres Row Level Security로 멀티테넌시 데이터 격리

### 3.4 멀티테넌시 대비
MVP에서는 `1 User = 1 Org` 구조이나, `orgs` + `org_members` 테이블을 미리 마련하여:
- 조직별 데이터 격리 (RLS `user_org_ids()` 함수)
- 향후 팀 초대, 역할 기반 접근 제어 확장 용이

### 3.5 알림 채널 추상화
`NotificationProvider` 인터페이스를 정의하고, `EmailProvider`(Resend)와 `KakaoProvider`(Mock)를 구현. 새 채널 추가 시 인터페이스만 구현하면 됨.

```typescript
interface NotificationProvider {
  send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }>;
}
```

### 3.6 점진적 향상 전략 (Progressive Enhancement)
MVP → 후속 확장 경로가 각 컴포넌트에 설계됨:
- 검색: ilike → pg_trgm similarity → OpenSearch/Elastic
- 리포트: 클라이언트 집계 → Supabase RPC/View → OLAP
- 수집: 단일 크론 → 배치 큐(inngest/BullMQ)
- 알림: 이메일 → 카카오/SMS/슬랙/웹훅

---

## 4. 폴더 구조

```
bid-platform/
├── docs/                          # 프로젝트 문서
│   ├── ARCHITECTURE.md            # 아키텍처 문서 (현재 파일)
│   ├── API_SPECIFICATION.md       # API 명세서
│   ├── DATABASE_SCHEMA.md         # DB 스키마 상세
│   ├── DEPLOYMENT_GUIDE.md        # 배포 & 운영 가이드
│   ├── DEVELOPMENT_GUIDE.md       # 개발 가이드 & 컨벤션
│   ├── UI_DESIGN.md               # 화면 설계 문서
│   └── ENHANCEMENT_ROADMAP.md     # 확장 로드맵
│
├── supabase/
│   ├── schema.sql                 # 전체 DB 스키마 (DDL)
│   └── migrations/
│       ├── 001_stabilize.sql      # 안정화 패치 (alert_logs UNIQUE, alert_rules.name, 인덱스)
│       ├── 002_auto_org_on_signup.sql  # 회원가입 시 자동 조직 생성 트리거
│       ├── 003_add_delete_policy.sql   # RLS DELETE 정책 추가
│       ├── 004_report_summary_function.sql  # 리포트 성능 개선 (Postgres RPC 함수)
│       └── 005_search_with_similarity.sql   # 검색 고도화 (pg_trgm GIN 인덱스)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root Layout + Providers
│   │   ├── (app)/                 # 메인 앱 라우트 그룹
│   │   │   ├── page.tsx           # 공고 목록 (메인)
│   │   │   ├── tenders/[id]/      # 공고 상세
│   │   │   ├── favorites/         # 즐겨찾기
│   │   │   ├── alerts/            # 알림 관리
│   │   │   └── reports/           # 리포트
│   │   ├── login/                 # 로그인/회원가입
│   │   └── api/                   # API Route Handlers
│   │       ├── auth/              # 인증 (signup, signin, signout)
│   │       ├── tenders/           # 공고 (list, [id])
│   │       ├── favorites/         # 즐겨찾기 (list, [tenderId])
│   │       ├── alerts/            # 알림 (rules, rules/[id], logs)
│   │       ├── reports/           # 리포트 (summary)
│   │       ├── jobs/              # 배치 작업 (poll-tenders, process-alerts)
│   │       └── health/            # 헬스체크
│   │
│   ├── components/
│   │   ├── header.tsx             # 전역 네비게이션
│   │   ├── providers.tsx          # Client Providers (Query, Tooltip, Toast)
│   │   └── ui/                    # shadcn/ui 컴포넌트 (23개)
│   │
│   ├── hooks/
│   │   └── use-api.ts             # TanStack Query 커스텀 훅
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # 브라우저 클라이언트
│   │   │   ├── server.ts          # SSR 클라이언트 (쿠키 기반)
│   │   │   └── service.ts         # Service Role 클라이언트
│   │   │
│   │   ├── notifications/
│   │   │   ├── types.ts           # NotificationProvider 인터페이스
│   │   │   ├── email-provider.ts  # Resend 이메일 발송
│   │   │   ├── kakao-provider.ts  # 카카오 알림 (Mock)
│   │   │   └── index.ts           # Provider 팩토리
│   │   │
│   │   ├── types.ts               # 도메인 타입 정의
│   │   ├── validations.ts         # Zod 스키마
│   │   ├── helpers.ts             # 유틸 함수
│   │   ├── api-response.ts        # API 응답 형식 헬퍼
│   │   └── auth-context.ts        # 인증 컨텍스트 헬퍼
│   │
│   └── middleware.ts              # Next.js 인증 미들웨어 (Next.js 16 표준)
│
├── supabase/
│   ├── schema.sql                 # 전체 DB 스키마 (DDL)
│   └── migrations/
│       ├── 001_stabilize.sql      # 안정화 패치 (alert_logs UNIQUE, alert_rules.name, 인덱스)
│       ├── 002_auto_org_on_signup.sql  # 회원가입 시 자동 조직 생성 트리거
│       ├── 003_add_delete_policy.sql   # RLS DELETE 정책 추가
│       ├── 004_report_summary_function.sql  # 리포트 성능 개선 (Postgres RPC 함수)
│       └── 005_search_with_similarity.sql   # 검색 고도화 (pg_trgm GIN 인덱스)
│
├── scripts/
│   └── seed-demo.mjs              # 데모 데이터 시드 스크립트
│
├── vercel.json                    # Vercel 크론 설정 (평일 09:00/09:30 UTC)
├── .env.example                   # 환경 변수 템플릿
├── .env.local                     # 로컬 환경 변수 (gitignore)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 5. 기술 선택 근거

| 기술 | 선택 이유 |
|---|---|
| **Next.js 16 (App Router)** | SSR/SSG 혼합, API Routes 내장, Vercel 최적화 |
| **Supabase** | Auth + DB + RLS 올인원, 무료 티어 충분, PostgREST 자동 |
| **TailwindCSS v4 + shadcn/ui** | 빠른 프로토타이핑, 일관된 디자인 시스템, 커스터마이징 유연 |
| **TanStack Query v5** | 서버 상태 관리, 캐시 무효화, 로딩/에러 상태 자동 처리 |
| **Zod v4** | 타입 안전 검증, TypeScript 추론과 완벽 통합 |
| **Resend** | 개발자 친화적 이메일 API, 무료 티어, API 단순 |
| **Vercel Cron** | 인프라 추가 없이 스케줄링, vercel.json으로 관리 |
| **pg_trgm** | 별도 검색 엔진 없이 한국어 부분 매칭 가능 |

---

## 6. 보안 아키텍처

### 6.1 인증 (Authentication)
- **Supabase Auth**: 이메일+비밀번호 기반 JWT 인증
- **세션 관리**: 쿠키 기반 세션, SSR 미들웨어에서 `getUser()` 호출로 검증
- **미들웨어**: `/favorites`, `/alerts`, `/reports` 경로는 인증 필수

### 6.2 인가 (Authorization)
- **RLS (Row Level Security)**: 모든 테이블에 활성화
  - `user_org_ids()` SQL 함수로 사용자 소속 조직 ID 조회
  - 공고/기관/낙찰: 전체 공개 읽기
  - 즐겨찾기/알림: 본인 조직 데이터만 접근
- **Service Role**: Cron Jobs만 사용 (RLS 우회 필요)

### 6.3 API 보안
- **Cron Secret**: `Authorization: Bearer <CRON_SECRET>` 헤더 검증
- **Input Validation**: 모든 사용자 입력은 Zod 스키마로 검증
- **Error Masking**: 내부 에러 메시지는 클라이언트에 노출하지 않음

---

## 7. 성능 고려사항

### 7.1 데이터베이스
- **인덱스 전략**: 15개 인덱스 (B-tree 기본 + GIN 트리그램)
  - `idx_tenders_title_trgm`: 제목 유사도 검색 (GIN)
  - `idx_tenders_demand_agency_name_trgm`: 수요기관명 검색 (GIN)
  - 기타 외래키, 상태, 지역, 업종 등 B-tree 인덱스
- **Postgres RPC**: 리포트 집계를 `report_summary()` 함수로 DB 레벨 처리
  - 5개 쿼리 + 클라이언트 집계 → 1개 RPC 함수 (성능 대폭 향상)
- **페이지네이션**: OFFSET 기반 (MVP), 향후 Cursor 기반으로 전환 가능
- **병렬 쿼리**: count + data 쿼리를 `Promise.all`로 동시 실행

### 7.2 프론트엔드
- **클라이언트 캐싱**: TanStack Query 기본 캐시 (staleTime)
- **Debounced Search**: 검색어 입력 300ms 디바운스
- **URL 동기화**: 검색 상태를 URL searchParams에 동기화 → 새로고침/공유 가능
- **UI 최적화**: focus-visible 개선, transition 250ms, card-hover 효과 강화

### 7.3 검색 고도화
- **pg_trgm 유사도 검색**: title + demand_agency_name OR 조건 검색
- **GIN 인덱스**: LIKE 연산자 성능 대폭 향상
- **다중 필드 검색**: 제목과 수요기관명을 동시 검색하여 관련성 향상

### 7.4 수집 파이프라인
- **지수 백오프**: 나라장터 API 실패 시 1s → 2s → 4s 재시도
- **Upsert**: `source_tender_id` 기준으로 INSERT or UPDATE → 에러 안전
- **에러 격리**: 개별 공고 처리 실패 시에도 전체 배치는 계속 진행

---

## 8. 향후 확장 방향 요약

> 상세 내용은 [ENHANCEMENT_ROADMAP.md](ENHANCEMENT_ROADMAP.md) 참조

| Phase | 주제 | 핵심 내용 |
|---|---|---|
| 1 | 배치 파이프라인 고도화 | 큐 기반(inngest), 증분 수집, Dead Letter |
| 2 | 검색 정밀화 | pg_trgm similarity, 가중치 스코어, 자동완성 |
| 3 | 분석 대시보드 | Supabase RPC/View, 차트 라이브러리, 내보내기 |
| 4 | AI 예측 분석 | Edge Function + OpenAI, 낙찰률 예측 |
| 5 | 멀티테넌시 & 결제 | Stripe 연동, 요금제 관리, 역할 기반 접근 |
