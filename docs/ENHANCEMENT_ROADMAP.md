# AI 입찰·조달 분석 플랫폼 — 고도화 로드맵

> MVP 이후 SaaS 고도화를 위한 설계 문서  
> 작성일: 2026-02-25

---

## 가정 사항 (Assumptions)

| # | 가정 | 영향 |
|---|------|------|
| 1 | 나라장터 API 응답은 JSON 형식이며 `serviceKey` 기반 인증 | API 파서 변경 시 `poll-tenders` Route만 수정 |
| 2 | MVP는 단일 org당 최대 5명 수준의 사용 | RLS 성능은 충분 |
| 3 | awards ↔ tenders 는 1:1 관계로 시작 | N건 낙찰은 고도화 Phase에서 1:N 전환 |
| 4 | Kakao 알림톡은 MVP에서 모킹 처리 | Provider 인터페이스 교체만으로 실발송 전환 가능 |
| 5 | Vercel Pro 플랜(Cron 최소 1분 단위) 사용 | Free 플랜은 일 1회 Cron만 가능 |

---

## Phase 1: 배치 파이프라인 고도화

### 현재 (MVP)
- Vercel Cron → `POST /api/jobs/poll-tenders` (매 10분)
- 단일 프로세스, 동기 실행, 실패 시 단순 재시도(3회 백오프)

### 목표
- **Upstash Redis + QStash** 기반 비동기 작업 큐
- 또는 **Supabase Edge Functions + pg_notify** 트리거

### 설계

```
┌─────────────┐     ┌──────────┐     ┌───────────────┐
│ Vercel Cron │────▶│  QStash  │────▶│ Edge Function │
│ (trigger)   │     │ (queue)  │     │ (worker)      │
└─────────────┘     └──────────┘     └───────┬───────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Supabase DB    │
                                    │  (upsert)       │
                                    └─────────────────┘
```

### 정책
| 정책 | 값 |
|------|----|
| 재시도 | 최대 5회, 지수 백오프 (1s → 2s → 4s → 8s → 16s) |
| 중복방지 | `source_tender_id` UNIQUE + idempotency key in Redis (TTL 24h) |
| 레이트리밋 | 나라장터 API 호출 10 req/sec, 일 50,000건 |
| 데드레터큐 | 5회 실패 시 `dead_letter_jobs` 테이블로 이동 |
| 모니터링 | Upstash Dashboard + Slack 웹훅 알림 |

---

## Phase 2: 검색 고도화

### 현재 (MVP)
- `pg_trgm` + GIN 인덱스로 `title ILIKE '%keyword%'` 검색
- 한국어 형태소 분석 없음

### 목표 (OpenSearch / Elasticsearch)

```
┌───────────┐   CDC/Trigger   ┌──────────────┐
│ Postgres  │───────────────▶│  OpenSearch  │
│ (source)  │                │  (index)     │
└───────────┘                └──────┬───────┘
                                    │
                            ┌───────▼───────┐
                            │  Search API   │
                            │  /api/search  │
                            └───────────────┘
```

### 동기화 전략
1. **Postgres Trigger** → `pg_notify('tender_changed', id)` 
2. **Edge Function** 리스닝 → OpenSearch bulk upsert
3. 일 1회 전체 인덱스 재구축 (safety net)

### 인덱스 설계
```json
{
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "nori" },
      "agency_name": { "type": "text", "analyzer": "nori" },
      "region_name": { "type": "keyword" },
      "industry_name": { "type": "keyword" },
      "budget_amount": { "type": "long" },
      "published_at": { "type": "date" },
      "deadline_at": { "type": "date" },
      "status": { "type": "keyword" }
    }
  }
}
```

---

## Phase 3: 분석·집계 고도화

### 현재 (MVP)
- Postgres 단순 집계 (`COUNT`, `SUM`, `GROUP BY`)
- 데이터 양 < 100K 건

### 목표
- **월별 파티셔닝**: `tenders` 테이블을 `published_at` 기준 월별 파티션
- **ClickHouse** 이관: 대용량 OLAP 쿼리

### Postgres 파티셔닝 예시
```sql
-- 파티션 테이블로 변환
CREATE TABLE tenders_partitioned (
    LIKE tenders INCLUDING ALL
) PARTITION BY RANGE (published_at);

CREATE TABLE tenders_2026_01 PARTITION OF tenders_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- ... 월별 반복
```

### ClickHouse 이관 전략
1. 실시간: Postgres → Kafka Connect → ClickHouse
2. 배치: 일 1회 `pg_dump` → ClickHouse bulk insert
3. API Layer: `/api/analytics/*` 는 ClickHouse 직접 조회

---

## Phase 4: 예측 모델

### 서빙 아키텍처

```
┌──────────┐     ┌───────────────┐     ┌──────────────┐
│ Next.js  │────▶│  FastAPI      │────▶│  ML Model    │
│ (BFF)    │     │  (Python)     │     │  (scikit/XGB)│
└──────────┘     └───────────────┘     └──────────────┘
```

### Feature 정의

| Feature | Type | 설명 |
|---------|------|------|
| `budget_amount` | numeric | 추정가격 |
| `region_code` | categorical | 지역 코드 |
| `industry_code` | categorical | 업종 코드 |
| `agency_history_avg_rate` | numeric | 해당 기관 과거 평균 낙찰률 |
| `agency_history_count` | numeric | 해당 기관 과거 공고 수 |
| `bid_count_same_period` | numeric | 동일 기간 경쟁 공고 수 |
| `month` | numeric | 공고 월 (계절성) |
| `method_type` | categorical | 계약 방식 |

### API 스펙 초안

```
POST /api/v1/predict/award-rate
Request:
{
  "tender_id": "uuid",
  "budget_amount": 50000000,
  "region_code": "11",
  "industry_code": "1234",
  "method_type": "competitive"
}

Response:
{
  "predicted_rate": 87.5,
  "confidence_interval": [82.1, 92.3],
  "recommended_bid_range": {
    "min": 43500000,
    "max": 46200000
  },
  "model_version": "v1.2.0"
}
```

### 모델 학습 파이프라인
1. 일 1회 Postgres → 학습 데이터 추출 (awards + tenders JOIN)
2. Feature engineering → scikit-learn / XGBoost 학습
3. MLflow 모델 레지스트리 등록
4. FastAPI 서빙 자동 배포 (Docker)

---

## Phase 5: 멀티테넌시 & 결제

### 플랜 구조

| 항목 | Free | Pro | Enterprise |
|------|------|-----|------------|
| 월 검색 | 100건 | 무제한 | 무제한 |
| 알림 규칙 | 3개 | 50개 | 무제한 |
| 사용자 수 | 2명 | 20명 | 무제한 |
| 예측 분석 | ❌ | ✅ | ✅ |
| API 키 발급 | ❌ | ❌ | ✅ |
| 가격 | 무료 | ₩99,000/월 | 별도 협의 |

### DB 확장

```sql
ALTER TABLE orgs ADD COLUMN plan text DEFAULT 'free';
ALTER TABLE orgs ADD COLUMN plan_expires_at timestamptz;
ALTER TABLE orgs ADD COLUMN stripe_customer_id text;
ALTER TABLE orgs ADD COLUMN stripe_subscription_id text;

CREATE TABLE payment_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES orgs(id),
    event_type text NOT NULL,          -- 'invoice.paid', 'subscription.updated' ...
    amount numeric,
    currency text DEFAULT 'KRW',
    provider text DEFAULT 'toss',      -- 'toss' | 'stripe'
    raw_json jsonb,
    created_at timestamptz DEFAULT now()
);
```

### 결제 플로우 (토스페이먼츠 / Stripe)

```
사용자 → 플랜 선택 → 결제창 (토스/Stripe Checkout)
       → 결제 완료 → Webhook → /api/webhooks/payment
       → org.plan 갱신 + payment_logs 기록
       → 사용자에게 확인 이메일
```

### Webhook 보안
- `x-toss-signature` / `stripe-signature` 검증
- 이벤트 idempotency key로 중복 처리 방지
- 실패 시 3회 재시도 + Slack 알림

---

## 구현 우선순위

```
            ┌───────────────────────────────────────┐
            │  Phase 1: 배치 파이프라인 (Week 5-6)    │
            ├───────────────────────────────────────┤
            │  Phase 2: 검색 고도화 (Week 7-8)       │
            ├───────────────────────────────────────┤
            │  Phase 3: 분석·집계 (Week 9-10)        │
            ├───────────────────────────────────────┤
            │  Phase 4: 예측 모델 (Week 11-14)       │
            ├───────────────────────────────────────┤
            │  Phase 5: 멀티테넌시/결제 (Week 15-16)  │
            └───────────────────────────────────────┘
```

---

## 기술 스택 요약 (고도화 포함)

| 레이어 | MVP | 고도화 |
|--------|-----|--------|
| Frontend | Next.js + shadcn/ui | + 차트 라이브러리 (recharts) |
| Auth | Supabase Auth | + SSO (SAML) |
| DB | Supabase Postgres | + 파티셔닝 + ClickHouse |
| 검색 | pg_trgm + GIN | + OpenSearch (Nori) |
| 큐 | Vercel Cron | + QStash / BullMQ |
| 알림 | Resend (Email) | + Kakao 비즈메시지 |
| ML | - | FastAPI + MLflow |
| 결제 | - | 토스/Stripe |
| 모니터 | - | Sentry + Upstash Monitor |
