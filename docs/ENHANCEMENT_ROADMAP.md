# AI 입찰·조달 분석 플랫폼 — 고도화 로드맵

> MVP 이후 SaaS 고도화를 위한 상세 개발 계획  
> 최초 작성: 2026-02-25 / 최종 업데이트: 2026-03-10  
> 기준: 개발자 1인 기준 최속 일정

---

## 현재 상태 요약 (2026-03-10 기준)

```
완성된 기능 (즉시 사용 가능)                  미완성 / 미활성
─────────────────────────────────────────────────────────────
✅ 나라장터 공고 자동 수집 (평일 1회)          ⚠️  이메일 알림 미발송 (API 키 미등록)
✅ 공고 검색 · 필터 · 페이징                  ⚠️  카카오 알림톡 모킹 상태
✅ 알림 규칙 CRUD (복합 조건)                 ⚠️  구독/결제 시스템 없음
✅ 즐겨찾기                                   ⚠️  팀 멤버 초대 UI 없음
✅ 분석 리포트 (PieChart / BarChart)          ⚠️  공고 수집 하루 1회 제한 (Hobby Plan)
✅ 인증 · RLS 멀티테넌트                      ⚠️  형태소 검색 없음 (ILIKE 수준)
✅ Premium UI / 다크모드 / 반응형             ⚠️  에러 모니터링 없음 (Sentry 미설치)
```

---

## 전체 로드맵 타임라인

```
2026-03-10  2026-03-17  2026-03-24  2026-04-07  2026-04-28  2026-06-09
     │           │           │           │           │           │
  Sprint 0    Sprint 1    Sprint 2   Sprint 3-4   Sprint 5     Sprint 6
  (3일)       (5일)       (7일)      (14일)      (21일)       (42일)
  이메일 활성  베타 런치   카카오+    결제+팀관리  검색고도화   AI 예측
              준비        알림개선                 +모니터링
```

---

## Sprint 0 — 이메일 알림 활성화 후 즉시 베타 오픈 가능

**기간**: 1~3일 (2026-03-10 ~ 2026-03-12)  
**목표**: 현재 코드에 이미 구현된 기능을 실제로 동작하도록 활성화

### 태스크 목록

| # | 태스크 | 난이도 | 소요 시간 | 방법 |
|---|--------|--------|----------|------|
| S0-1 | **Resend 계정 개설 + 도메인 인증** | 쉬움 | 1시간 | resend.com 가입, DNS MX/TXT 레코드 등록 |
| S0-2 | **Vercel 환경변수 RESEND_API_KEY 등록** | 쉬움 | 10분 | Vercel 대시보드 → Settings → Environment Variables |
| S0-3 | **알림 이메일 HTML 템플릿 개선** | 보통 | 3시간 | React Email 또는 인라인 HTML, 브랜드 컬러 적용 |
| S0-4 | **end-to-end 테스트** | 쉬움 | 1시간 | 알림 규칙 생성 → poll-tenders 수동 실행 → 이메일 수신 확인 |
| S0-5 | **ALERT_FROM_EMAIL 환경변수 등록** | 쉬움 | 5분 | `noreply@yourdomain.com` 설정 |

**완료 기준**: 알림 규칙 조건 충족 시 실제 이메일 수신 확인

### 이메일 템플릿 예시 구조 (S0-3)

```html
제목: [BidSight] 새 입찰 공고 {N}건이 등록되었습니다

헤더: BidSight 로고 + Indigo 브랜드 배너
본문:
  - 공고명 (링크)
  - 발주기관 / 예산 / 마감일
  - D-day 표시
  - [공고 상세 보기] 버튼
푸터: 알림 규칙 설정 링크 / 수신 거부 링크
```

---

## Sprint 1 — 베타 런치 준비

**기간**: 5일 (2026-03-13 ~ 2026-03-17)  
**목표**: 외부 사용자에게 베타 공개 가능한 상태

### 태스크 목록

| # | 태스크 | 난이도 | 소요 시간 | 세부 내용 |
|---|--------|--------|----------|----------|
| S1-1 | **Vercel Pro 업그레이드** | 쉬움 | 30분 | Hobby → Pro, Cron 최소 1분 단위 지원 |
| S1-2 | **Cron 간격 조정 (10분)** | 쉬움 | 10분 | `vercel.json` cron 표현식 `*/10 * * * *` 으로 변경 |
| S1-3 | **공개 랜딩 페이지 제작** | 보통 | 1일 | 미인증 사용자 진입 시 보이는 홍보 페이지 (기능 소개, 회원가입 CTA) |
| S1-4 | **커스텀 도메인 연결** | 쉬움 | 2시간 | bidsight.kr 또는 원하는 도메인 → Vercel DNS 설정 |
| S1-5 | **Sentry 에러 트래킹 설치** | 쉬움 | 2시간 | `@sentry/nextjs` 설치, DSN 환경변수 등록, Source Maps 업로드 |
| S1-6 | **데모 데이터 투입** | 쉬움 | 30분 | `node scripts/seed-demo.mjs` 실행으로 샘플 공고 투입 |
| S1-7 | **robots.txt / sitemap.xml** | 쉬움 | 1시간 | SEO 기본 설정 |

**완료 기준**: 외부인이 접속 → 회원가입 → 알림 설정 → 이메일 수신 전 과정 가능

---

## Sprint 2 — 카카오 알림톡 + 알림 시스템 강화

**기간**: 7일 (2026-03-18 ~ 2026-03-24)  
**목표**: 카카오 알림톡 실 발송 구현 + 알림 내용 품질 향상

> ⚠️ **병행 작업 필요**: 카카오 비즈메시지 채널 개설 심사는 **외부 심사 2~3주** 소요.
> Sprint 2 시작과 동시에 카카오 채널 개설 신청을 해야 Sprint 3 전에 사용 가능.

### 태스크 목록

| # | 태스크 | 난이도 | 소요 시간 | 세부 내용 |
|---|--------|--------|----------|----------|
| S2-1 | **카카오 비즈메시지 채널 개설 신청** | 외부 | 1일 | kakao.com/business → 채널 개설 → 비즈메시지 신청 (심사 2~3주) |
| S2-2 | **`KakaoProvider` 실발송 구현** | 보통 | 4시간 | 카카오 알림톡 REST API 연동, 템플릿 등록 후 발송 |
| S2-3 | **알림 발송 재시도 로직 추가** | 보통 | 3시간 | 발송 실패 시 30분 후 최대 3회 재시도, `alert_logs.retry_count` 컬럼 추가 |
| S2-4 | **알림 발송 통계 UI** | 보통 | 4시간 | 알림 규칙 목록에 "최근 7일 발송 X건" 표시 |
| S2-5 | **발송 실패 알림 (관리자)** | 쉬움 | 2시간 | 발송 실패율 > 10% 시 관리자 이메일 발송 |
| S2-6 | **수신 거부 (Unsubscribe) 링크** | 보통 | 3시간 | 이메일 하단 수신거부 → `alert_rules.is_enabled = false` 토글 |

### 카카오 알림톡 구현 설계

```typescript
// src/lib/notifications/kakao-provider.ts 수정

export class KakaoProvider implements NotificationProvider {
  private apiKey: string;
  private senderKey: string;
  private templateCode: string;

  async send(payload: NotificationPayload) {
    // POST https://kakaoapi.alimtalk.kakao.com/alimtalk/v2.2/talk/messages/A
    const response = await fetch('https://kakaoapi.alimtalk.kakao.com/...', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `KakaoAK ${this.apiKey}`,
      },
      body: JSON.stringify({
        senderKey: this.senderKey,
        templateCode: this.templateCode,
        recipientList: [{ recipientNo: payload.to, ... }]
      }),
    });
    // ...
  }
}
```

---

## Sprint 3 — 팀 멤버 관리 + 구독 플랜 기본 구조

**기간**: 7일 (2026-03-25 ~ 2026-03-31)  
**목표**: 팀 협업 기능 활성화 + 플랜 제한 로직 백엔드 구현

### 태스크 목록

| # | 태스크 | 난이도 | 소요 시간 | 세부 내용 |
|---|--------|--------|----------|----------|
| S3-1 | **팀 멤버 초대 UI** | 보통 | 1일 | Settings 페이지 → 이메일 초대 → `org_members` insert |
| S3-2 | **초대 이메일 발송** | 쉬움 | 2시간 | 초대 토큰 생성 → Resend 이메일 발송 → 토큰 검증 |
| S3-3 | **`orgs.plan` 컬럼 추가 (Migration)** | 쉬움 | 1시간 | `free` / `pro` / `business` / `enterprise` ENUM |
| S3-4 | **플랜별 제한 미들웨어** | 보통 | 4시간 | API에서 `org.plan` 조회 → 알림 규칙 수 제한, 즐겨찾기 수 제한 체크 |
| S3-5 | **플랜 표시 UI** | 쉬움 | 2시간 | 헤더 / 설정 페이지에 현재 플랜 표시 + 업그레이드 CTA 버튼 |
| S3-6 | **멤버 역할 관리 (admin/member)** | 보통 | 3시간 | `org_members.role` ENUM, 관리자만 멤버 초대/삭제 가능 |

### DB 마이그레이션 (Sprint 3)

```sql
-- supabase/migrations/002_plan_and_members.sql

ALTER TABLE orgs ADD COLUMN plan text NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'pro', 'business', 'enterprise'));
ALTER TABLE orgs ADD COLUMN plan_expires_at timestamptz;
ALTER TABLE orgs ADD COLUMN plan_updated_at timestamptz DEFAULT now();

ALTER TABLE org_members ADD COLUMN role text NOT NULL DEFAULT 'member'
  CHECK (role IN ('admin', 'member'));

CREATE TABLE org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_invitations_token ON org_invitations(token);
```

---

## Sprint 4 — 결제 시스템 (토스페이먼츠)

**기간**: 7일 (2026-04-01 ~ 2026-04-07)  
**목표**: 실제 유료 구독 구매 플로우 구현

### 태스크 목록

| # | 태스크 | 난이도 | 소요 시간 | 세부 내용 |
|---|--------|--------|----------|----------|
| S4-1 | **토스페이먼츠 사업자 계정 개설** | 외부 | 2일 | 사업자등록증 제출, 심사 1~3 영업일 |
| S4-2 | **`/pricing` 페이지 제작** | 보통 | 4시간 | 플랜 비교 카드, 연/월 토글, 플랜 선택 버튼 |
| S4-3 | **결제 API 구현** (`/api/payments/checkout`) | 어려움 | 1일 | 토스 SDK, 결제창 호출, 결제 완료 검증 |
| S4-4 | **Webhook 처리** (`/api/webhooks/toss`) | 어려움 | 4시간 | `payment.done` → `org.plan` 갱신, 영수증 이메일 발송 |
| S4-5 | **정기 결제 (구독) 구현** | 어려움 | 1일 | 빌링키 발급, 매월 자동 결제, 갱신 실패 시 다운그레이드 |
| S4-6 | **결제 이력 UI** | 보통 | 3시간 | Settings → 결제 이력 테이블 (`payment_logs` 조회) |

### DB 마이그레이션 (Sprint 4)

```sql
-- supabase/migrations/003_payments.sql

CREATE TABLE payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  plan text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'KRW',
  provider text NOT NULL DEFAULT 'toss',
  payment_key text,             -- 토스 paymentKey
  billing_key text,             -- 정기결제 빌링키
  order_id text NOT NULL,       -- 멱등성 키
  status text NOT NULL,         -- 'DONE', 'CANCELED', 'FAILED'
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_payment_logs_order_id ON payment_logs(order_id);

ALTER TABLE orgs ADD COLUMN toss_billing_key text;
ALTER TABLE orgs ADD COLUMN toss_customer_key text;
```

---

## Sprint 5 — 검색 고도화 + 에러 모니터링

**기간**: 21일 (2026-04-08 ~ 2026-04-28)  
**목표**: 한국어 형태소 검색 + 운영 안정성 확보

### 5-A. 검색 고도화 (14일)

| # | 태스크 | 난이도 | 소요 시간 | 세부 내용 |
|---|--------|--------|----------|----------|
| S5-1 | **Postgres FTS + pg_bigm 적용** | 보통 | 1일 | `pg_bigm`(2-gram) 인덱스로 한국어 검색 개선, OpenSearch 이전 전 단계 |
| S5-2 | **검색 결과 하이라이팅** | 보통 | 3시간 | 검색어 위치 `<mark>` 태그 강조 표시 |
| S5-3 | **연관 검색어 추천** | 보통 | 1일 | `tenders` 테이블 제목 단어 빈도 분석 → 자동완성 드롭다운 |
| S5-4 | **OpenSearch (AWS) 연동** | 어려움 | 3일 | nori 형태소 분석기, Postgres CDC → OS 동기화 |
| S5-5 | **검색 API 전환** | 보통 | 1일 | `/api/tenders` → OpenSearch 쿼리로 백엔드 교체 |

### 5-B. 운영 안정성 (7일)

| # | 태스크 | 난이도 | 소요 시간 | 세부 내용 |
|---|--------|--------|----------|----------|
| S5-6 | **로그 수집 구조화** | 쉬움 | 4시간 | `console.error` → Sentry `captureException` 전환, 주요 API 성능 측정 |
| S5-7 | **API Rate Limiting** | 보통 | 4시간 | Upstash Redis + `@upstash/ratelimit`, 사용자별 분당 제한 |
| S5-8 | **Cron 실행 모니터링** | 쉬움 | 2시간 | Healthcheck URL + BetterUptime 5분 간격 ping 모니터링 |
| S5-9 | **Slack 운영 알림** | 쉬움 | 2시간 | Cron 실패 / 결제 이벤트 / 에러 급증 시 Slack 웹훅 알림 |

---

## Sprint 6 — AI 낙찰률 예측 모델

**기간**: 42일 (2026-04-29 ~ 2026-06-09)  
**목표**: 낙찰률 예측 ML 서비스 릴리스

### ML 서비스 아키텍처

```
┌──────────────┐   REST    ┌─────────────────┐   추론
│  Next.js     │──────────▶│  FastAPI         │──────▶ ML Model
│  (Frontend)  │           │  (Python)        │        (XGBoost)
└──────────────┘           └────────┬─────────┘
                                    │ 학습 데이터 조회
                           ┌────────▼─────────┐
                           │  Supabase DB     │
                           │  (awards JOIN    │
                           │   tenders)       │
                           └──────────────────┘
```

### 태스크 목록

| # | 태스크 | 난이도 | 소요 시간 | 세부 내용 |
|---|--------|--------|----------|----------|
| S6-1 | **학습 데이터 수집 (awards 누적)** | 쉬움 | 진행중 | 매일 자동 수집 中, 1,000건 이상 확보 후 학습 시작 |
| S6-2 | **EDA (탐색적 분석)** | 보통 | 3일 | Jupyter Notebook, 특성 중요도 분석, 이상치 제거 |
| S6-3 | **Feature Engineering** | 보통 | 3일 | 기관별 과거 낙찰률 평균, 업종별 경쟁 밀도, 계절성 등 |
| S6-4 | **XGBoost 모델 학습 + 평가** | 어려움 | 1주 | Cross-validation, RMSE/MAE 평가, 하이퍼파라미터 튜닝 |
| S6-5 | **FastAPI 서빙 서버 구축** | 보통 | 3일 | Docker 컨테이너, Railway/Render 배포, 헬스체크 |
| S6-6 | **예측 API 연동** (`/api/predict/award-rate`) | 보통 | 2일 | Next.js → FastAPI 프록시, 공고 상세 페이지에 예측값 표시 |
| S6-7 | **예측 결과 UI** | 보통 | 2일 | 낙찰 예측 %, 신뢰구간, 추천 입찰가 Range 표시 |
| S6-8 | **모델 재학습 스케줄링** | 보통 | 1일 | 주 1회 Cron → 데이터 추출 → 재학습 → 자동 배포 |

### 예측 Feature 정의

| Feature | 타입 | 설명 |
|---------|------|------|
| `budget_amount` | numeric | 추정가격 |
| `region_code` | categorical | 지역 코드 |
| `industry_code` | categorical | 업종 코드 |
| `method_type` | categorical | 계약 방식 (일반/제한/지명경쟁) |
| `agency_avg_rate_past_1y` | numeric | 해당 기관 최근 1년 평균 낙찰률 |
| `agency_bid_count_past_1y` | numeric | 해당 기관 최근 1년 공고 수 |
| `industry_avg_rate` | numeric | 업종 전체 평균 낙찰률 |
| `publish_month` | numeric | 공고 월 (계절성) |
| `days_to_deadline` | numeric | 공고일 → 마감일 기간 (일) |

### 예측 API 스펙

```
POST /api/predict/award-rate
Request:
{
  "tender_id": "uuid"
}

Response:
{
  "predicted_rate": 87.5,           // 예측 낙찰률 (%)
  "confidence_interval": [82.1, 92.3],
  "recommended_bid_range": {
    "low":  { "amount": 43500000, "rate": 87.0 },
    "mid":  { "amount": 44800000, "rate": 89.6 },
    "high": { "amount": 46200000, "rate": 92.4 }
  },
  "model_version": "v1.0.0",
  "trained_at": "2026-04-28",
  "sample_size": 3847
}
```

---

## 장기 로드맵 (2026 H2)

| 항목 | 내용 | 예상 시기 |
|------|------|---------|
| **OpenSearch 전환** | nori 형태소, 유사어 검색, 관련 공고 추천 | 2026 Q3 |
| **배치 파이프라인 고도화** | QStash 비동기 큐, 데드레터 큐, 재시도 대시보드 | 2026 Q3 |
| **멀티 조직 API** | 외부 개발자 API 키 발급 (Enterprise) | 2026 Q3 |
| **화이트라벨 (OEM)** | 조직별 커스텀 도메인, 로고, 컬러 | 2026 Q4 |
| **SSO (SAML/OIDC)** | 기업 계정 연동 (Okta, Azure AD) | 2026 Q4 |
| **모바일 앱 (PWA)** | 푸시 알림, 오프라인 캐시 | 2026 Q4 |
| **ClickHouse OLAP** | 수백만 건 대용량 분석 쿼리 | 2027 Q1 |

---

## 일정 요약 (1인 개발자 기준)

```
Week   날짜             Sprint            주요 산출물
───────────────────────────────────────────────────────────────────
W0     3/10 ~ 3/12      Sprint 0 (3일)    이메일 알림 실발송
W1     3/13 ~ 3/17      Sprint 1 (5일)    베타 공개, Sentry, 도메인
W2-3   3/18 ~ 3/24      Sprint 2 (7일)    카카오 코드 완성, 알림 강화
W4-5   3/25 ~ 3/31      Sprint 3 (7일)    팀 멤버 초대, 플랜 제한
W6-7   4/01 ~ 4/07      Sprint 4 (7일)    토스 결제, 구독 플로우
W8-11  4/08 ~ 4/28      Sprint 5 (21일)   검색 고도화, Rate Limit
W12-17 4/29 ~ 6/09      Sprint 6 (42일)   AI 낙찰률 예측 릴리스
───────────────────────────────────────────────────────────────────
총계:  약 13주 (3개월)
───────────────────────────────────────────────────────────────────
```

> **참고사항**
> - 카카오 비즈메시지 채널 개설 심사(외부): 2~3주 소요 → Sprint 2 시작과 동시에 신청
> - 토스페이먼츠 사업자 심사(외부): 1~3 영업일 → Sprint 3 시작과 동시에 신청
> - AI 모델 학습은 awards 데이터 1,000건 이상 확보 후 가능 (현재 수집 중)
> - Sprint 6은 데이터 수집 상황에 따라 일정 변동 가능

---

## 비용 추정 (월 운영비)

| 항목 | 현재 (MVP) | 상용 서비스 |
|------|-----------|-----------|
| Vercel | Hobby 무료 | Pro $20/월 |
| Supabase | Free Tier | Pro $25/월 |
| Resend | Free (100건/일) | Pro $20/월 (50,000건) |
| Sentry | Free | $26/월 (팀 플랜) |
| Upstash Redis | Free | $10/월 |
| OpenSearch | - | AWS ~$50/월 |
| FastAPI 서버 | - | Railway/Render $7/월 |
| **합계** | **$0** | **~$158/월** |

---

## 현재 구현 상태 대비 고도화 체크리스트

```
── 즉시 가능 (코드 이미 있음) ──────────────────────────────
[ ] Resend API 키 등록 → 이메일 알림 활성화
[ ] Vercel Pro 업그레이드 → Cron 10분 간격

── Sprint 1 (~2026-03-17) ───────────────────────────────────
[ ] 랜딩 페이지
[ ] 커스텀 도메인
[ ] Sentry 에러 트래킹

── Sprint 2 (~2026-03-24) ───────────────────────────────────
[ ] 카카오 비즈메시지 채널 개설 신청 (외부 심사 병행)
[ ] 이메일 HTML 템플릿 개선
[ ] 알림 재시도 로직

── Sprint 3 (~2026-03-31) ───────────────────────────────────
[ ] 팀 멤버 초대 UI
[ ] Migration 002 (plan, org_invitations)
[ ] 플랜별 API 제한

── Sprint 4 (~2026-04-07) ───────────────────────────────────
[ ] 토스페이먼츠 사업자 계정 (외부 심사 병행)
[ ] /pricing 페이지
[ ] 결제 + Webhook
[ ] 정기 구독 빌링

── Sprint 5 (~2026-04-28) ───────────────────────────────────
[ ] pg_bigm 또는 OpenSearch 검색
[ ] API Rate Limiting
[ ] Cron 모니터링

── Sprint 6 (~2026-06-09) ───────────────────────────────────
[ ] FastAPI + XGBoost 서빙
[ ] 예측 UI 공고 상세 연동
[ ] 모델 재학습 자동화
```

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

---

## 미래 확장 과제 — 공공데이터 SaaS 보일러플레이트 활용

> BidSight의 핵심 아키텍처(Cron 수집 → DB 저장 → 알림 매칭 → 리포트)는  
> **도메인만 교체하면 그대로 재사용 가능한 공공데이터 SaaS 보일러플레이트**입니다.  
> 아래 항목들은 BidSight 코드베이스를 fork·재활용하여 확장 가능한 후속 과제입니다.

---

### EXT-1. 특허 모니터링 SaaS ⭐ 최우선 추천

**대상 API**: 특허청 KIPRIS Open API → USPTO (글로벌 확장)  
**타깃**: 중견 R&D 팀, 법무법인, 특허 사무소  
**핵심 기능**:
- 경쟁사 출원 특허 실시간 모니터링
- 기술분류(IPC) 코드 기반 알림
- 특허 만료일 D-day 알림
- 출원인·발명자 트렌드 분석

```
예상 단가: 월 ₩30,000 ~ ₩100,000 (B2B 고단가)
주요 API: https://plus.kipris.or.kr/
확장 경로: KIPRIS → USPTO → EPO (유럽) 글로벌 SaaS
BidSight 재사용 범위: 수집 Cron, 알림 매칭 로직, 리포트 구조 90% 재사용
```

---

### EXT-2. 법령·고시·행정규칙 변경 알림 (RegTech)

**대상 API**: 국가법령정보센터 Open API (law.go.kr)  
**타깃**: 컴플라이언스 담당자, 법무팀, 규제 대응 컨설팅사  
**핵심 기능**:
- 특정 법령 개정 시 즉시 알림
- 업종별 관련 법령 묶음 구독
- 개정 전/후 조문 Diff 비교 뷰
- 시행일 D-day 카운트다운

```
예상 단가: 월 ₩29,900 ~ ₩99,000
주요 API: https://open.law.go.kr/
확장 경로: 국내 법령 → 지자체 조례 → 해외 규제(GDPR, FDA 등)
```

---

### EXT-3. 부동산 공시가격·실거래가 분석 플랫폼

**대상 API**: 국토교통부 실거래가 API, 공시지가 API  
**타깃**: 자산운용사, 리츠(REITs) 운용팀, 부동산 컨설팅사  
**핵심 기능**:
- 특정 지역·건물 실거래가 변동 알림
- 공시가격 고시 시 즉시 알림
- 시세 트렌드 차트 (기관투자자 대시보드)
- 경매 낙찰가율 통계

```
예상 단가: 월 ₩49,000 ~ ₩199,000 (B2B 틈새)
주요 API: https://openapi.its.go.kr/ / https://data.go.kr/
확장 경로: 공시가 → 경매 → 임대차 시장 통합 분석
```

---

### EXT-4. 식품·의약품 허가·규제 변경 알림

**대상 API**: 식품의약품안전처 Open API (mfds.go.kr)  
**타깃**: 식품·제약·의료기기 업체 RA(인허가) 담당자  
**핵심 기능**:
- 신규 성분·제품 허가 현황 모니터링
- 회수·판매금지 품목 즉시 알림
- 원료 기준·규격 변경 추적
- 경쟁사 신규 허가 품목 추적

```
예상 단가: 월 ₩39,900 ~ ₩149,000
주요 API: https://apis.data.go.kr/1471000/ (식약처 오픈 API)
확장 경로: 식약처 → 농촌진흥청 → 환경부 화학물질 통합
```

---

### EXT-5. 건강보험·급여기준 변경 모니터링

**대상 API**: 건강보험심사평가원(HIRA) Open API  
**타깃**: 병원·약국 원무팀, 의료 컨설팅사, 제약 영업팀  
**핵심 기능**:
- 급여기준·수가 개정 알림
- 청구 코드 신설·변경 모니터링
- 적정성 평가 결과 공개 알림
- 기관별 진료 실적 통계

```
예상 단가: 월 ₩49,000 ~ ₩199,000 (의료기관 대상 틈새)
주요 API: https://www.hira.or.kr/bbsDr/openapi/
확장 경로: HIRA → 국민건강보험공단 → 질병관리청 감염병 데이터
```

---

### EXT-6. 고용·채용공고 인텔리전스 (워크넷 기반)

**대상 API**: 고용노동부 워크넷 Open API, 사람인 API  
**타깃**: HR 컨설팅사, 헤드헌팅 기업, 인력 아웃소싱사  
**핵심 기능**:
- 특정 직무·기술스택 공고량 트렌드
- 경쟁사 채용 동향 알림
- 지역·업종별 구인난 지수 분석
- 임금 수준 벤치마크 리포트

```
예상 단가: 월 ₩19,900 ~ ₩59,000
주요 API: https://openapi.work.go.kr/
확장 경로: 워크넷 → 잡코리아/사람인 스크레이핑 통합
```

---

### EXT-7. 보조금·R&D 과제 공고 알림

**대상 API**: 범부처통합연구지원시스템(IRIS), NTIS, 기업마당  
**타깃**: 중소기업 R&D 기획팀, 정책자금 컨설팅사, 대학 산학협력단  
**핵심 기능**:
- 정부 R&D 과제 공고 실시간 알림
- 주관기관·분야 조건 필터
- 보조금 지원 기간 D-day 알림
- 기관별 과제 채택률 통계

```
예상 단가: 월 ₩29,900 ~ ₩99,000
주요 API: https://www.ntis.go.kr/openapi, https://www.bizinfo.go.kr/
확장 경로: 국내 R&D → EU Horizon, US SBIR 글로벌 확장
```

---

### EXT-8. 환경·인허가·안전 규제 모니터링

**대상 API**: 환경부 환경빅데이터 플랫폼, 산업안전보건공단 API  
**타깃**: 제조업·건설업 EHS(환경안전보건) 담당자, 환경 컨설팅사  
**핵심 기능**:
- 환경부 허가·신고 기준 변경 알림
- 안전보건 법령 개정 추적
- 온실가스·배출권 거래 동향 리포트
- 사업장 위험 도구 모음

```
예상 단가: 월 ₩39,900 ~ ₩149,000
주요 API: https://api.ecobank.or.kr/, https://www.kosha.or.kr/
확장 경로: 규제 알림 → ESG 공시 자동화 통합 플랫폼
```

---

### 확장 우선순위 매트릭스

```
                  낮은 개발 비용 ──────────────── 높은 개발 비용
                        │                             │
높은    ┌───────────────┼─────────────────────────────┤
수익성  │  EXT-1 특허   │  EXT-5 건강보험             │
(B2B)   │  EXT-7 R&D   │  EXT-3 부동산               │
        ├───────────────┼─────────────────────────────┤
낮은    │  EXT-2 법령   │  EXT-4 식약처               │
수익성  │  EXT-6 고용   │  EXT-8 환경·인허가           │
        └───────────────┴─────────────────────────────┘
               → 1순위: EXT-1 (특허) / EXT-7 (R&D)
```

---

### 공통 재사용 아키텍처

> 모든 확장 과제는 아래 BidSight 구성 요소를 **그대로 재사용**합니다.

| BidSight 컴포넌트 | 재사용 방식 |
|------------------|------------|
| `src/app/api/jobs/poll-tenders/route.ts` | 수집 Cron → 해당 API 엔드포인트로 교체 |
| `src/app/api/jobs/process-alerts/route.ts` | 알림 매칭 로직 → 조건 필드명만 수정 |
| `src/lib/notifications/` | 이메일·카카오 알림 → 그대로 사용 |
| `src/app/(app)/reports/page.tsx` | 통계 대시보드 → 데이터 스키마 교체 |
| `src/lib/supabase/` | Auth + RLS 멀티테넌트 → 그대로 사용 |
| `supabase/schema.sql` | `tenders` 테이블 → 도메인 테이블로 교체 |
| `src/components/ui/` | shadcn/ui 컴포넌트 → 100% 재사용 |

**예상 포팅 기간**: 신규 도메인 1개 → 약 2~3주 (API 파악 1주 + 스키마·수집 1주 + UI 1주)
