# Smart Bid Radar — CTO 기술 전체 점검 보고서

> **작성일**: 2026-04-03  
> **버전**: 0.3.0  
> **분석자**: GitHub Copilot (CTO 관점)  
> **분석 기준**: SaaS 실 출시 기준 · 확장 가능한 구조 기준 · MVP 우선 기준

---

## 목차

1. [시스템 구조 분석](#1-시스템-구조-분석)
2. [Supabase 구조 점검](#2-supabase-구조-점검)
3. [나라장터 API 연동 준비 상태](#3-나라장터-api-연동-준비-상태)
4. [SaaS 구조 점검](#4-saas-구조-점검)
5. [AI 분석 기능 준비 상태](#5-ai-분석-기능-준비-상태)
6. [문서 자동 생성 구조 분석](#6-문서-자동-생성-구조-분석)
7. [시스템 전체 점수 평가](#7-시스템-전체-점수-평가)
8. [문제점 요약 — 최우선 5가지](#8-문제점-요약--최우선-5가지)
9. [개선 우선순위 로드맵](#9-개선-우선순위-로드맵)
10. [추천 아키텍처](#10-추천-아키텍처)
11. [MVP 출시 가능 여부](#11-mvp-출시-가능-여부)
12. [다음 개발 단계](#12-다음-개발-단계)

---

## 1. 시스템 구조 분석

### 현재 구조

```
[Browser]
    │
    ▼
[Next.js 16 App Router — Vercel icn1]
    │  /app/(app)/*   → RSC + Client Components
    │  /app/api/*     → Route Handlers (Business Logic)
    │  src/middleware → Auth Guard + Rate Limit (in-memory)
    │
    ▼
[Supabase (Seoul)]
    │  PostgreSQL 16
    │  GoTrue Auth
    │  RLS + Triggers + RPCs (SQL-only AI)
    │
    ├── Vercel Cron (Mon–Fri UTC 00:00 / 00:10 / 00:30)
    │       → poll-tenders       : 나라장터 공고 수집
    │       → collect-bid-awards : 개찰결과 수집
    │       → process-alerts     : 알림 처리
    │
    └── Resend (Email) / Kakao (미구현 Stub)
```

### ⚠️ 구조적 불일치 — 최우선 인지 사항

| 기술 항목 | 프로젝트 설명서 | 실제 구현 |
|-----------|----------------|-----------|
| Frontend | Vite + React | **Next.js 16 App Router** |
| Backend AI | Python (AI/ML) | **PostgreSQL RPC (SQL 통계)** |
| AI Engine | ML 예측 모델 | **SQL 통계 함수만 존재** |

> 기술 스택 설명서가 실제 코드와 완전히 다름. 외부 IR/투자자 문서 작성 시 혼선 유발.

### API 구조 (구현 완료 19개 엔드포인트)

```
src/app/api/
├── alerts/
│   ├── logs/route.ts              GET  — 알림 로그 조회
│   └── rules/
│       ├── route.ts               GET, POST — 알림 규칙 목록/생성
│       └── [id]/route.ts          PATCH, DELETE — 알림 규칙 수정/삭제
├── auth/
│   ├── signin/route.ts            POST — 로그인
│   ├── signout/route.ts           POST — 로그아웃
│   └── signup/route.ts            POST — 회원가입
├── bid-analysis/
│   ├── recommend/route.ts         GET  — 입찰가 추천
│   ├── similar/route.ts           GET  — 유사 공고
│   └── stats/route.ts             GET  — 낙찰 통계
├── favorites/
│   ├── route.ts                   GET  — 즐겨찾기 목록
│   └── [tenderId]/route.ts        POST, DELETE — 즐겨찾기 추가/삭제
├── health/route.ts                GET  — 헬스체크
├── jobs/
│   ├── collect-bid-awards/route.ts  GET (Cron) — 낙찰정보 수집
│   ├── poll-tenders/route.ts        POST (Cron) — 공고 수집
│   └── process-alerts/route.ts      POST (Cron) — 알림 처리
├── reports/
│   └── summary/route.ts           GET  — 보고서 요약
└── tenders/
    ├── route.ts                   GET  — 공고 목록 (필터/페이지)
    ├── summary/route.ts           GET  — 공고 KPI 요약
    └── [id]/route.ts              GET  — 공고 상세
```

### 문제점

| # | 문제 | 심각도 |
|---|------|:------:|
| P1 | **인메모리 Rate Limiter** — Vercel 서버리스는 요청마다 별개 인스턴스 → rate limit 사실상 무효 | 🔴 Critical |
| P2 | `(app)/page.tsx` 단일 파일에 약 900줄 집중 | 🟡 Medium |
| P3 | `/app/(app)/tenders/` 에 목록 페이지 없음 — 대시보드 `page.tsx`가 목록 역할 겸임 | 🟡 Medium |
| P4 | `next.config.ts` 완전 비어있음 — Security Headers, 이미지 최적화, CORS 없음 | 🟡 Medium |
| P5 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` 브라우저 노출 (URL은 공개 OK, 패턴 혼용 주의) | 🟢 Low |

### 개선 구조

```
[Browser]
    │
    ▼
[Next.js 16 App Router — Vercel Pro/Team]
    │  next.config.ts: Security Headers, Image domains
    │  middleware.ts: Rate Limit → Upstash Redis
    │
    ▼
[Supabase]
    │
    ├── [Python FastAPI — Fly.io / Railway]  ← AI/ML 실제 구현 시
    │       POST /analyze/bid-price
    │       POST /analyze/similarity
    │       GET  /train/model-status
    │
    └── [Vercel Cron → Railway Scheduler로 분리 권장]
```

---

## 2. Supabase 구조 점검

### 현재 상태

```
orgs ──→ org_members ──→ auth.users
          │
agencies ─┤
          │
tenders ──┼──→ awards (1:1 ← 문제)
          ├──→ favorites (user_id + tender_id UNIQUE)
          ├──→ alert_logs
          └──→ bid_notices
                  └──→ bid_open_results
                          └──→ bid_awards
                                  ├──→ bid_price_features (trigger 자동계산)
                                  └──→ bid_recommendations (캐시, TTL 24h)
```

**Extensions**: `pgcrypto`, `pg_trgm`  
**RLS**: 전 테이블 적용. tenders/agencies/awards = public read. favorites/alert_rules = 조직 범위  
**Triggers**: `set_updated_at()` (agencies, tenders, awards, alert_rules), `trg_bid_awards_compute_features` (is_final=TRUE 시 자동계산)

### 문제점

| # | 문제 | 심각도 |
|---|------|:------:|
| S1 | **`awards.tender_id UNIQUE` (1:1 구조)** — 공동 수급, 부분 낙찰, 재입찰 저장 불가 | 🔴 Critical |
| S2 | **`bid_notices → tenders` FK가 `ON DELETE SET NULL`** — 공고 삭제 시 분석 데이터 고아(orphan) 발생 | 🟠 High |
| S3 | **복합 인덱스 부재** — `(status, deadline_at)`, `(region_code, industry_code)` 등 복합 필터 쿼리 인덱스 없음 | 🟠 High |
| S4 | **`user_org_ids()` 함수가 모든 RLS 평가마다 호출** — N+1 RLS 성능 문제 | 🟡 Medium |
| S5 | **`plan` 컬럼이 `orgs`에만 존재** — 구독 만료일, 결제 상태, 인보이스 정보 없음 | 🟡 Medium |
| S6 | **`alert_logs` 보존 정책 없음** — TTL cleanup 없음, 무한 누적 | 🟡 Medium |

### 개선안

```sql
-- S1: awards 1:N 구조로 변경
ALTER TABLE awards DROP CONSTRAINT awards_tender_id_key;
-- (tender_id, bidder_registration_no) 복합 UNIQUE로 대체

-- S3: 핵심 복합 인덱스 추가
CREATE INDEX idx_tenders_status_deadline
  ON tenders(status, deadline_at)
  WHERE status = 'OPEN';

CREATE INDEX idx_tenders_region_industry
  ON tenders(region_code, industry_code, published_at DESC);

CREATE INDEX idx_tenders_budget_range
  ON tenders(budget_amount)
  WHERE budget_amount IS NOT NULL;

-- S6: 알림 로그 90일 보존
CREATE OR REPLACE FUNCTION cleanup_old_alert_logs()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM alert_logs WHERE created_at < NOW() - INTERVAL '90 days';
$$;
```

---

## 3. 나라장터 API 연동 준비 상태

### 현재 상태

`/api/jobs/poll-tenders/route.ts` **이미 구현됨**:
- `getBidPblancListInfoServc` 호출
- 기관 upsert → 공고 upsert 순서 처리
- `retryWithBackoff` 3회 재시도
- `CRON_SECRET` 검증

`/api/jobs/collect-bid-awards/route.ts` **이미 구현됨**:
- 개찰결과 API + 낙찰정보 API 호출
- `bid_notices`, `bid_open_results`, `bid_awards` upsert

**Vercel Cron 스케줄 (UTC):**

| Job | UTC | KST | 역할 |
|-----|-----|-----|------|
| collect-bid-awards | 00:10 | 09:10 | 낙찰정보 수집 |
| poll-tenders | 00:00 | 09:00 | 공고 수집 |
| process-alerts | 00:30 | 09:30 | 알림 처리 |

### 문제점

| # | 문제 | 심각도 |
|---|------|:------:|
| A1 | **Vercel Hobby 플랜 — Cron 실행 시간 제한 10초** — 나라장터 API 1회 호출+처리에 충분히 초과 가능 | 🔴 Critical |
| A2 | **나라장터 API 키 환경변수 설정 미문서화** — `.env.example` 파일 없음, 키 누락 시 조용히 실패 | 🔴 Critical |
| A3 | **페이지네이션 처리 부재** — 나라장터 API 최대 100건/회. 대량 수집 시 전체 반복 루프 없음 | 🟠 High |
| A4 | **수집 이력 테이블 없음** — `last_collected_at`, 수집 성공/실패 로그, 중단점 재시작 없음 | 🟠 High |
| A5 | Cron 시간 UTC 기준. 00:10 → 00:00 → 00:30 실행 순서의 의존성 관리 필요 | 🟡 Medium |

### 개선 구조

```typescript
// migration 012: 수집 이력 테이블 추가
CREATE TABLE collection_logs (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type          text NOT NULL,        -- 'tenders' | 'awards'
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  status            text,                 -- 'success' | 'partial' | 'failed'
  records_collected int DEFAULT 0,
  last_page_no      int DEFAULT 1,        -- 재시작 지점
  error_message     text,
  created_at        timestamptz DEFAULT now()
);

// 페이지네이션 루프 구조 (poll-tenders/route.ts)
async function collectAllPages(apiKey: string, baseParams: object) {
  let pageNo = 1;
  let hasMore = true;
  while (hasMore) {
    const data = await callNaraAPI({ ...baseParams, pageNo, numOfRows: 100 });
    await upsertBatch(data.items);
    hasMore = data.totalCount > pageNo * 100;
    pageNo++;
    if (pageNo > 50) break; // 안전 상한선
  }
}
```

---

## 4. SaaS 구조 점검

### 현재 상태

```typescript
// src/lib/auth-context.ts
export const PLAN_LIMITS = {
  free:       { alertRules: 3,   favorites: 50 },
  pro:        { alertRules: 50,  favorites: Infinity },
  enterprise: { alertRules: Infinity, favorites: Infinity },
} as const;
```

- `orgs` 테이블에 `plan` 컬럼 존재 (free / pro / enterprise)
- 사용량 제한: API Route Handler에서 수동 COUNT(*) 체크
- `org_members`: admin / member 역할 구분 존재
- 자동 조직 생성: `handle_new_user()` DB 트리거 (migration 002)

### 문제점

| # | 문제 | 심각도 |
|---|------|:------:|
| B1 | **결제/과금 시스템 완전 부재** — Stripe 미연동. 수익화 불가 상태 | 🔴 Critical |
| B2 | **플랜 업그레이드 UI/Flow 없음** — Pro/Enterprise 전환 경로 없음 | 🔴 Critical |
| B3 | **구독 만료/갱신 로직 없음** — `plan`을 DB에서 수동 변경해야만 업그레이드 됨 | 🔴 Critical |
| B4 | **사용량 집계가 매 요청마다 COUNT(*)** — `usage_counts` 캐시 테이블 없음 | 🟠 High |
| B5 | **멀티테넌시 불완전** — `favorites`는 `user_id` 기준 (조직 내 공유 즐겨찾기 불가) | 🟡 Medium |
| B6 | **팀 초대 기능 없음** — 조직에 멤버 추가 경로 없음 | 🟡 Medium |

### 개선 구조

```sql
-- Stripe 연동 최소 구조

-- 1. subscriptions 테이블
CREATE TABLE subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_sub_id        text UNIQUE,
  stripe_cust_id       text,
  plan                 text NOT NULL DEFAULT 'free',
  status               text NOT NULL DEFAULT 'active', -- active|past_due|canceled
  current_period_end   timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- 2. 팀 초대 테이블
CREATE TABLE org_invitations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid REFERENCES orgs(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'member',
  token      text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

```typescript
// Stripe Webhook → /api/billing/webhook
// plan 변경, 갱신, 만료 자동 처리
// checkout.session.completed → plan 업그레이드
// customer.subscription.deleted → plan 'free' 강등
// invoice.payment_failed → 결제 실패 알림
```

---

## 5. AI 분석 기능 준비 상태

### 현재 상태

구현된 "AI" 구조 (실제는 SQL 통계):

```sql
-- migration 009: recommend_bid_price() 내부 로직
1. get_similar_bids()           → industry_code + region_code 기반 유사 공고 검색
2. calculate_bid_rate_stats()   → avg, stddev, percentile 계산
3. 전략별 가격 공식:
   conservative = base_price * (avg_rate - 1σ)   -- 보수적
   standard     = base_price * avg_rate            -- 표준
   aggressive   = base_price * (avg_rate + 0.5σ)  -- 공격적
4. lower_limit_rate 하한선 클램핑
```

**`bid_price_features` 자동 계산 항목 (trigger):**
- `price_to_base_ratio`, `winner_rate_deviation`, `competition_intensity`
- 3개월/6개월 이동평균, `trend_direction`

### 문제점

| # | 문제 | 심각도 |
|---|------|:------:|
| C1 | **Python AI 엔진이 존재하지 않음** — "AI SaaS" 표방하나 SQL 통계만 존재. ML 모델 없음 | 🔴 Critical |
| C2 | **유사도 계산이 `industry_code + region_code` 단순 매칭** — 시멘틱 유사도, 공고 임베딩 없음 | 🟠 High |
| C3 | **시드 데이터 60건으로 통계 기반 부족** — 실서비스 낙찰 예측은 최소 수천 건 필요 | 🟠 High |
| C4 | **`trend_direction`이 최근 3개월 vs 이전 3개월 단순 비교** — 계절성, 경기 변동 미반영 | 🟡 Medium |
| C5 | **모델 버전 관리, 재학습 파이프라인 없음** | 🟡 Medium |

### 개선 구조

**단기 (SQL 통계 보완):**

```sql
-- pg_trgm 유사도를 공고명 텍스트까지 확장
SELECT *, similarity(t.title, target_title) AS title_sim
FROM tenders t
WHERE similarity(t.title, target_title) > 0.3
ORDER BY title_sim DESC;
```

**중기 (Python FastAPI AI 서비스 — Railway/Fly.io):**

```python
# 낙찰률 예측 모델
from sklearn.ensemble import GradientBoostingRegressor
import pandas as pd

class BidRatePredictor:
    """
    Features:
    - budget_amount, industry_code, region_code
    - competition_count (참여사 수), agency_type
    - season (month), fiscal_year_quarter
    - historical_avg_rate (기관별, 업종별)
    """
    def train(self, bid_awards_df: pd.DataFrame): ...

    def predict(self, tender_features: dict) -> dict:
        # returns: { rate: float, confidence: float, percentile: float }
        ...
```

**장기 (임베딩 + pgvector):**

```python
# 공고명 벡터화 → pgvector 저장 → 코사인 유사도 검색
from sentence_transformers import SentenceTransformer
# pgvector extension → tenders.title_embedding vector(768)
# 현재 region_code+industry_code 매칭보다 정확도 대폭 향상
```

---

## 6. 문서 자동 생성 구조 분석

### 현재 상태

`/app/(app)/reports/page.tsx`:
- 날짜 범위 선택 → `report_summary()` RPC 호출
- 차트 렌더링 (PieChart: 상태 분포, BarChart: 기관/업종 TOP 10)
- KPI 카드 표시 (총 공고 수, 총 예산, 기관 수, 업종 수)

`/api/reports/summary/route.ts`:
- 단순 RPC 래퍼, JSONB 반환

### 문제점

| # | 문제 | 심각도 |
|---|------|:------:|
| D1 | **PDF/Excel 내보내기 기능 없음** — "보고서" 페이지가 있으나 파일 생성 불가 | 🟠 High |
| D2 | **보고서 저장/히스토리 없음** — `reports` 테이블 없음, 생성한 보고서 저장 불가 | 🟠 High |
| D3 | **보고서 템플릿 시스템 없음** — 업종별, 기관별 맞춤 보고서 불가 | 🟡 Medium |
| D4 | **공유/다운로드 링크 없음** — 보고서 URL 공유 불가 | 🟡 Medium |

### 개선 구조

**단기: 브라우저 PDF 내보내기**

```typescript
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2 });
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  pdf.save(`${filename}-${Date.now()}.pdf`);
}
```

**중기: 보고서 저장 + Supabase Storage**

```sql
CREATE TABLE reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES orgs(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id),
  title         text NOT NULL,
  from_date     timestamptz,
  to_date       timestamptz,
  storage_path  text,        -- Supabase Storage PDF 경로
  summary_data  jsonb,       -- 당시 스냅샷 저장
  created_at    timestamptz DEFAULT now()
);
```

---

## 7. 시스템 전체 점수 평가

| 평가 항목 | 점수 | 주요 감점 요인 |
|-----------|:----:|----------------|
| **시스템 구조** | **62 / 100** | 인메모리 rate limiter (-20), Security Headers 없음 (-10), 900줄 단일 파일 (-8) |
| **SaaS 구조** | **38 / 100** | 결제 시스템 전무 (-35), 업그레이드 Flow 없음 (-15), 팀 초대 없음 (-12) |
| **AI 준비 상태** | **30 / 100** | 실제 ML 없음 (-40), 데이터 60건 부족 (-20), 임베딩/벡터 검색 없음 (-10) |
| **확장성** | **55 / 100** | 인메모리 상태 미확장 (-20), 복합 인덱스 부재 (-15), Vercel Hobby 제한 (-10) |
| **안정성** | **65 / 100** | RLS 전 테이블 적용 (+), KakaoProvider stub (-15), 수집 이력 없음 (-10), awards 1:1 취약 (-10) |
| **종합 평균** | **50 / 100** | MVP 진입 가능 수준. 실 서비스 출시엔 핵심 미싱 블록 다수 존재 |

---

## 8. 문제점 요약 — 최우선 5가지

### 🔴 CRITICAL-1: 결제 시스템 부재

"SaaS 플랫폼"이라 정의했으나 수익화 체계가 전무.  
`plan` 컬럼은 DB에 있으나 Stripe 미연동, 업그레이드 UI 없음, 구독 만료 처리 없음.  
**이 상태로는 SaaS가 아니라 무료 서비스.**

**영향**: 비즈니스 모델 실현 불가. 투자 유치, 수익화 모두 차단.

---

### 🔴 CRITICAL-2: Rate Limiter 무효화

`src/middleware.ts`의 rate limiting은 Node.js `Map` 기반 인메모리.  
Vercel 서버리스는 요청마다 새 인스턴스 스핀업 → 각 인스턴스가 독립 Map 보유 → **rate limit 사실상 작동 안 함.**

**영향**: DoS 방어 구멍. 나라장터 API 키 소진, 서비스 불안정 위험.

```typescript
// 즉시 수정 방법
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
});
```

---

### 🔴 CRITICAL-3: Python AI 엔진 미존재

기획서에 "Python AI/ML 백엔드"가 명시되어 있으나 실제 구현은 PostgreSQL SQL 함수만 존재.  
`recommend_bid_price()`는 평균/표준편차 계산이지 머신러닝이 아님.

**영향**: "AI SaaS"로 마케팅 시 기술 허위 표시 위험. 정확도 한계 (계절성·경기 변동 미반영).

---

### 🔴 CRITICAL-4: 나라장터 수집 신뢰성 부재

- API 키 환경변수 설정 미문서화
- 페이지네이션 루프 없음 (100건 초과 시 누락)
- 수집 이력/재시작 구조 없음
- Vercel Hobby 10초 타임아웃으로 대용량 수집 실패 가능

**영향**: 실 데이터 수집 불안정. 공고 누락 발생 시 사용자 신뢰 손상.

---

### 🟠 HIGH-5: awards 테이블 1:1 제약

`awards.tender_id UNIQUE`는 1개 공고에 1개 낙찰만 허용.  
나라장터 공동 수급, 부분 낙찰, 재입찰 시나리오 저장 불가.

**영향**: 향후 데이터 마이그레이션 비용 증가. 실제 낙찰 데이터 정확성 훼손.

---

## 9. 개선 우선순위 로드맵

### Phase 1 — 즉시 수정 (Week 1–2)

> 목표: 보안·안정성 기반 확보

```
□ Upstash Redis Rate Limiter 교체
    npm install @upstash/ratelimit @upstash/redis
    middleware.ts 전면 교체

□ next.config.ts Security Headers 추가
    X-Frame-Options: DENY
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Content-Security-Policy (기본값)

□ .env.example 파일 생성
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    NARA_API_KEY
    CRON_SECRET
    RESEND_API_KEY
    UPSTASH_REDIS_REST_URL
    UPSTASH_REDIS_REST_TOKEN

□ migration 012: collection_logs 테이블 추가
□ poll-tenders: 페이지네이션 루프 구현
```

---

### Phase 2 — 수익화 기반 (Week 3–4)

> 목표: SaaS 비즈니스 모델 실현

```
□ Stripe 계정 개설 + 상품/가격 설정
    - Free: 무료
    - Pro: ₩49,000/월
    - Enterprise: ₩199,000/월 (협의)

□ /api/billing/checkout route 구현
    → Stripe Checkout Session 생성

□ /api/billing/webhook route 구현
    → checkout.session.completed: plan 업그레이드
    → customer.subscription.deleted: free 강등
    → invoice.payment_failed: 알림 발송

□ migration 013: subscriptions 테이블 추가

□ /pricing 페이지 UI
□ 기능 제한 도달 시 업그레이드 유도 모달
□ Vercel Pro 업그레이드 (or Railway Cron 분리)
```

---

### Phase 3 — 데이터 품질 강화 (Week 5–8)

> 목표: 실 데이터 확보 및 DB 구조 최적화

```
□ migration 014: awards 1:N 구조 변경
□ migration 015: 복합 인덱스 추가
    - idx_tenders_status_deadline (PARTIAL WHERE status='OPEN')
    - idx_tenders_region_industry
    - idx_tenders_budget_range

□ 나라장터 실 API 키 환경변수 설정 + 테스트 수집 실행
    → bid_awards 최소 1,000건 확보 목표

□ alert_logs 90일 TTL cleanup 함수 추가
□ 보고서 PDF 내보내기 (html2canvas + jsPDF)
□ migration 016: reports 저장 테이블 + Supabase Storage 연동
```

---

### Phase 4 — AI 실체화 (Week 9–16)

> 목표: 실제 ML 기반 낙찰률 예측 구현

```
□ Python FastAPI 프로젝트 초기화 (Railway)
    - /predict/bid-rate
    - /predict/strategy
    - /health

□ 데이터 파이프라인 구성
    bid_awards → pandas DataFrame → feature engineering

□ GradientBoosting 낙찰률 예측 모델 v1
    - 교차검증 (5-fold)
    - 정확도 목표: MAE < 5%p

□ Next.js → Python 서비스 프록시 (/api/ai/*)
□ pgvector extension 설치
□ tenders.title_embedding 컬럼 추가
□ 공고명 batch 임베딩 (sentence-transformers)
□ 월 1회 자동 재학습 파이프라인 (GitHub Actions)
```

---

### Phase 5 — 성장 인프라 (Week 17+)

> 목표: 팀 기능·알림 채널 확장·글로벌 준비

```
□ 팀 초대 / 멤버 관리 UI
    - migration 017: org_invitations 테이블
    - 초대 이메일 발송 (Resend)

□ KakaoTalk 알림 실구현
    - 카카오 비즈니스 채널 등록
    - kakao-provider.ts 실 구현

□ Enterprise: 맞춤 보고서 템플릿
□ Enterprise: API 접근 (API Key 발급)
□ 인앱 알림 (Supabase Realtime 구독)
□ 모바일 PWA 지원
□ 조달청 국제 조달 데이터 확장
```

---

## 10. 추천 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SMART BID RADAR — 목표 아키텍처                       │
├─────────────────┬───────────────────────────────────────────────────────┤
│                 │                                                        │
│   Frontend      │  Next.js 16 App Router (현행 유지)                     │
│                 │  + Vercel Pro (Seoul icn1)                            │
│                 │  + next.config.ts Security Headers                   │
│                 │  + TanStack Query (현행 유지)                          │
│                 │                                                        │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                        │
│   Backend       │  Next.js Route Handlers (현행 API 구조 유지)            │
│                 │  + Upstash Redis                                      │
│                 │    → Rate Limiting (분산)                              │
│                 │    → Session Cache / 추천 캐시                         │
│                 │  + Stripe (billing/webhook)                           │
│                 │  + Resend (이메일 알림)                                 │
│                 │  + KakaoTalk (알림 — Phase 5)                         │
│                 │                                                        │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                        │
│   Database      │  Supabase PostgreSQL (현행 유지)                        │
│                 │  + pgvector (임베딩 유사도 검색 — Phase 4)              │
│                 │  + Supabase Storage (보고서 PDF — Phase 3)            │
│                 │  + 복합 인덱스 추가 (Phase 3)                          │
│                 │  + RLS 전 테이블 (현행 유지)                            │
│                 │                                                        │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                        │
│   AI Engine     │  [Phase 1–3] 현행 SQL 통계 유지                        │
│                 │  [Phase 4] Python FastAPI on Railway                  │
│                 │    - scikit-learn GradientBoosting 낙찰률 예측          │
│                 │    - sentence-transformers 공고 임베딩                  │
│                 │    - POST /predict/bid-rate                           │
│                 │    - POST /predict/strategy                           │
│                 │    - Next.js /api/ai/* 프록시                          │
│                 │                                                        │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                        │
│   Scheduler     │  [Phase 1–2] Vercel Cron Pro (현행 + 10초 제한 해소)   │
│                 │  [Phase 3+] Railway Cron / GitHub Actions             │
│                 │    - 페이지네이션 루프 + 수집 이력 관리                  │
│                 │    - 월 1회 ML 모델 재학습                             │
│                 │                                                        │
└─────────────────┴───────────────────────────────────────────────────────┘
```

**데이터 흐름:**

```
나라장터 API
    │ (Scheduler — 평일 09:00 KST)
    ▼
Supabase tenders / bid_awards
    │
    ├── [Trigger] bid_price_features 자동 계산
    │
    ├── [RPC] recommend_bid_price() — 단기 SQL 통계
    │           ↓ Phase 4
    │   [Python AI] /predict/bid-rate — ML 모델
    │
    └── [RPC] report_summary() → Frontend Chart
```

---

## 11. MVP 출시 가능 여부

### 판정: **부분 가능 (Conditional)**

#### 지금 당장 출시 가능한 것 (Free Tier MVP)

| 기능 | 상태 |
|------|:----:|
| 공고 조회, 검색, 필터 | ✅ 완료 |
| 즐겨찾기 관리 | ✅ 완료 |
| 알림 규칙 설정 + 이메일 발송 | ✅ 완료 |
| 낙찰 분석 통계 (SQL 기반) | ✅ 완료 |
| 보고서 차트 조회 | ✅ 완료 |
| 이메일 회원가입/로그인 | ✅ 완료 |
| 다크모드 | ✅ 완료 |

#### 출시 전 반드시 해결해야 할 것

| 항목 | 이유 |
|------|------|
| Rate Limiter → Upstash Redis | DoS 방어 (OWASP 기본 요건) |
| Security Headers 추가 | OWASP A05: Security Misconfiguration |
| `.env.example` 작성 | 나라장터 API 키 설정 없이 수집 불가 |
| Vercel Pro 업그레이드 | Hobby Cron 10초 제한으로 수집 실패 위험 |

#### 2~3개월 내 실 SaaS 출시 조건

| 항목 | 이유 |
|------|------|
| Stripe 과금 구조 완성 | SaaS = 수익화 |
| 나라장터 실데이터 1,000건+ 수집 | AI 통계 신뢰성 확보 |
| 팀 초대 기능 | B2B SaaS 필수 기능 |

---

## 12. 다음 개발 단계

```
Week 1 (보안 기반)
  ├── npm install @upstash/ratelimit @upstash/redis
  ├── src/middleware.ts — Redis Rate Limiter 교체
  ├── next.config.ts — Security Headers 추가
  └── .env.example 작성 (전체 환경변수 목록)

Week 2 (수집 신뢰성)
  ├── supabase/migrations/012_collection_logs.sql
  ├── src/app/api/jobs/poll-tenders/route.ts — 페이지네이션 루프
  ├── src/app/api/jobs/collect-bid-awards/route.ts — 수집 이력 기록
  └── 나라장터 실 API 키 설정 + 테스트 수집 실행

Week 3 (수익화 준비)
  ├── Stripe 계정 개설 + 상품 정의 (Free / Pro / Enterprise)
  ├── supabase/migrations/013_subscriptions.sql
  ├── src/app/api/billing/checkout/route.ts
  ├── src/app/api/billing/webhook/route.ts
  └── Vercel Pro 업그레이드

Week 4 (수익화 UI)
  ├── src/app/pricing/page.tsx
  ├── 기능 제한 모달 컴포넌트 (업그레이드 유도)
  └── 결제 완료 후 plan 자동 반영 검증

Week 5–6 (DB 최적화)
  ├── supabase/migrations/014_awards_1_to_n.sql
  ├── supabase/migrations/015_composite_indexes.sql
  ├── supabase/migrations/016_alert_logs_cleanup.sql
  └── 보고서 PDF 내보내기 (html2canvas + jsPDF)

Week 7–8 (보고서 고도화)
  ├── supabase/migrations/017_reports_table.sql
  ├── Supabase Storage 버킷 생성 (reports-pdf)
  ├── src/app/api/reports/export/route.ts
  └── src/app/(app)/reports/page.tsx — 저장/히스토리 UI

Week 9–12 (AI 실체화)
  ├── Python FastAPI 프로젝트 초기화 (bid-ai-service/)
  ├── 학습 데이터 파이프라인: bid_awards → CSV export
  ├── GradientBoosting 낙찰률 예측 모델 v1 학습
  ├── Railway 배포 + 환경변수 설정
  └── src/app/api/ai/* — Next.js 프록시 Route Handler
```

---

## 부록 — 환경변수 체크리스트

| 변수명 | 용도 | 현재 설정 |
|--------|------|:---------:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (서버 전용) | ✅ |
| `NARA_API_KEY` | 나라장터 OpenAPI 키 | ❓ |
| `CRON_SECRET` | Vercel Cron 요청 검증 | ❓ |
| `RESEND_API_KEY` | 이메일 발송 (Resend) | ❓ |
| `UPSTASH_REDIS_REST_URL` | Redis Rate Limiter (미구현) | ❌ |
| `UPSTASH_REDIS_REST_TOKEN` | Redis Rate Limiter (미구현) | ❌ |
| `STRIPE_SECRET_KEY` | Stripe 결제 (미구현) | ❌ |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 검증 (미구현) | ❌ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 클라이언트 키 (미구현) | ❌ |

---

## 부록 — Migration 현황

| 파일 | 내용 | 상태 |
|------|------|:----:|
| `001_stabilize.sql` | alert_logs UNIQUE, 인덱스 추가 | ✅ |
| `002_auto_org_on_signup.sql` | 회원가입 시 조직 자동 생성 트리거 | ✅ |
| `003_add_delete_policy.sql` | alert_rules 삭제 RLS | ✅ |
| `004_report_summary_function.sql` | report_summary() 최초 구현 | ✅ |
| `005_search_with_similarity.sql` | pg_trgm, GIN 인덱스 | ✅ |
| `006_bid_intelligence_tables.sql` | 낙찰 분석 테이블 5개 생성 | ✅ |
| `007_bid_intelligence_fixes.sql` | FK, RLS, calculate_avg_bid_rate() | ✅ |
| `008_bid_price_features_trigger.sql` | bid_price_features 자동계산 트리거 | ✅ |
| `009_bid_analysis_enhancements.sql` | recommend_bid_price() v2, get_similar_bids() | ✅ |
| `010_bid_stats_rpc.sql` | get_bid_stats() KPI + trend + top N | ✅ |
| `011_fix_report_summary_agency.sql` | LEFT JOIN + COALESCE 수정 | ✅ |
| `012_collection_logs.sql` | 수집 이력 테이블 | **미작성** |
| `013_subscriptions.sql` | Stripe 구독 테이블 | **미작성** |
| `014_awards_1_to_n.sql` | awards 1:N 구조 변경 | **미작성** |
| `015_composite_indexes.sql` | 복합 인덱스 추가 | **미작성** |
| `016_reports_table.sql` | 보고서 저장 테이블 | **미작성** |

---

> **총평**: 코드 품질과 구조는 시니어 수준의 Next.js 앱으로 잘 구성되어 있음. 그러나 "AI SaaS"로서의 핵심 블록 (결제, 실 AI 엔진, 안정적 데이터 수집)이 부재. 현재는 나라장터 뷰어 + SQL 통계 분석 도구에 가까움. 위 Phase 1–2 완료 후 진정한 SaaS MVP 출시 가능.
