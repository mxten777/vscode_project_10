# 배포 & 운영 가이드

> AI 입찰·조달 분석 플랫폼 — Deployment & Operations Guide

---

## 1. 사전 준비

### 1.1 필수 계정

| 서비스 | 용도 | 무료 티어 |
|---|---|---|
| [Supabase](https://supabase.com) | Auth + Postgres DB | 500MB DB, 50k MAU |
| [Vercel](https://vercel.com) | Next.js 호스팅 + Cron | Hobby plan 무료 |
| [공공데이터포털](https://data.go.kr) | 나라장터 API 키 | 무료 |
| [Resend](https://resend.com) | 이메일 발송 | 100통/일 무료 |

### 1.2 필수 도구

```bash
node >= 18.17.0
npm >= 9.0.0
git
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com) → **New Project**
2. 설정:
   - **Organization**: 기존 또는 새로 생성
   - **Project Name**: `bid-platform`
   - **Database Password**: 안전한 비밀번호 설정 (보관)
   - **Region**: `Northeast Asia (Seoul)` 권장
3. 프로젝트 생성 완료 대기 (1-2분)

### 2.2 API 키 확인

Dashboard → **Settings** → **API**:

| 키 이름 | 환경 변수 | 설명 |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| anon (public) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 클라이언트용 (RLS 적용) |
| service_role (secret) | `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 (RLS 우회, **비공개**) |

> ⚠️ `service_role` 키는 절대 클라이언트에 노출하지 마세요.

### 2.3 데이터베이스 스키마 적용

> 현재 운영 기준의 소스 오브 트루스는 `supabase/schema.sql` 단일 파일이 아니라 `supabase/migrations/*.sql` 입니다.

1. 가능하면 **Supabase CLI** 또는 마이그레이션 실행 방식으로 `supabase/migrations/` 파일을 **번호 순서대로 전체 적용**합니다.
2. SQL Editor를 수동 사용한다면 `001_stabilize.sql`부터 최신 파일까지 순서대로 실행합니다.
3. `supabase/schema.sql`은 **초기 구조 참고용**으로만 사용하고, 단독 실행 기준으로 사용하지 않습니다.
4. 적용 후 기본 테이블 외에 아래 확장 테이블/기능이 생성되었는지 확인합니다:
  - `bid_notices`, `bid_open_results`, `bid_awards`, `bid_price_features`
  - `collection_logs`, `subscriptions`, `reports`, `analysis_cache`
  - `company_profiles`, `recommendation_logs`, `bid_participants`
5. AI 기능 사용 시 `018_pgvector.sql` 이후 마이그레이션까지 반영되었는지 반드시 확인합니다.
6. `027_bid_participants_unique.sql` 과 `027_saved_searches.sql` 처럼 번호가 같은 파일도 있으므로 파일명 전체 기준으로 누락 없이 확인합니다.

### 2.3.1 개별 마이그레이션 적용 메모

운영 중 특정 마이그레이션만 추가 반영해야 할 때는 아래 순서로 진행합니다.

```bash
# Supabase CLI를 쓰는 경우
supabase link --project-ref <your-project-ref>
supabase db push
```

- 현재 Cron 모니터링 확장을 위해서는 `029_expand_collection_logs_for_cron.sql` 이 반영돼 있어야 합니다.
- `rebuild-analysis` 가 `UPDATE requires a WHERE clause` 로 실패하면 `030_fix_sync_agency_counts_safeupdate.sql` 도 함께 반영해야 합니다.
- 저장소에 `supabase/config.toml` 이 없는 경우에도 `supabase link` 후 `db push` 는 가능합니다.
- CLI 연결이 어렵다면 Supabase SQL Editor에서 `029_expand_collection_logs_for_cron.sql`, `030_fix_sync_agency_counts_safeupdate.sql` 내용을 수동 실행해도 됩니다.

운영 검증 메모:
- 프로덕션 `cron-maintenance` 는 `029`, `030` 적용 후 `alerts`, `analysis_rebuild`, `participants` 성공 로그가 `collection_logs` 에 남는 것까지 확인했습니다.
- Vercel `CRON_SECRET` 값을 바꾼 경우에는 **재배포 후**에만 런타임에 반영됩니다.

### 2.4 Auth 설정

Dashboard → **Authentication** → **Providers**:

1. **Email** 활성화 (기본)
   - **Confirm Email**: 개발 시 비활성화 권장 (또는 signup API에서 `email_confirm: true` 사용)
   - **Secure email change**: 활성화

2. **URL Configuration**:
   - **Site URL**: `https://your-domain.vercel.app`
   - **Redirect URLs**: `https://your-domain.vercel.app/**`

### 2.5 Extensions 확인

Dashboard → **Database** → **Extensions**:
- `pgcrypto`: 활성화 확인
- `pg_trgm`: 활성화 확인 (검색 기능에 필수)
- `vector` 또는 `pgvector`: 활성화 확인 (유사 공고 검색 및 임베딩 기능에 필수)

---

## 3. 공공데이터포털 API 키

### 3.1 발급

1. [data.go.kr](https://www.data.go.kr) 회원가입/로그인
2. **나라장터 입찰공고목록 조회** 서비스 검색
3. **활용신청** → 승인 대기 (보통 즉시~1일)
4. **마이페이지** → **활용신청현황** → 인증키 복사

### 3.2 API 정보

| 항목 | 값 |
|---|---|
| Base URL | `https://apis.data.go.kr/1230000` |
| 엔드포인트 | `/ad/BidPublicInfoService/getBidPblancListInfoServc` (운영계정) |
| 인증 | `serviceKey` 쿼리 파라미터 |
| 응답 형식 | JSON (`type=json`) |

---

## 4. Resend 설정

### 4.1 API 키 발급

1. [Resend Dashboard](https://resend.com/api-keys) → **Create API Key**
2. 키 이름: `bid-platform-prod`
3. Permission: **Sending access**
4. Domain: 연결하거나 기본 `onboarding@resend.dev` 사용 (개발용)

### 4.2 도메인 연결 (프로덕션)

1. Resend → **Domains** → **Add Domain**
2. 도메인의 DNS에 MX, TXT 레코드 추가
3. 검증 완료 후 커스텀 발신 주소 사용 가능

---

## 5. 로컬 개발 환경

### 5.1 프로젝트 클론 & 설치

```bash
git clone <repository-url>
cd bid-platform
npm install
```

### 5.2 환경 변수 설정

```bash
# .env.example을 복사
cp .env.example .env.local
```

`.env.local` 편집:

```dotenv
# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# 서버 전용 런타임 URL (NEXT_PUBLIC_ 는 빌드 타임에 고정됨 — DB 교체 시 필수)
SUPABASE_URL=https://xxxxx.supabase.co

# ── Cron Secret ──
CRON_SECRET=your-random-secret-string-here

# ── Operations Console ──
ADMIN_CONSOLE_EMAILS=ops@example.com,founder@example.com

# ── 나라장터 API ──
NARA_API_KEY=your-data.go.kr-api-key
# 낙찰 수집 전용 키 (없으면 NARA_API_KEY fallback)
NARA_AWARD_API_KEY=your-award-api-key
NARA_API_BASE_URL=https://apis.data.go.kr/1230000

# ── Email (Resend) ──
RESEND_API_KEY=re_xxxxxxxxxxxxx
ALERT_FROM_EMAIL=noreply@yourdomain.com

# ── App ──
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5.3 개발 서버 실행

```bash
npm run dev
```

→ `http://localhost:3000` 에서 확인

### 5.4 빌드 테스트

```bash
npm run build
npm start
```

---

## 6. Vercel 배포

### 6.1 프로젝트 연결

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project**
2. Git 저장소 Import (GitHub/GitLab/Bitbucket)
3. Framework Preset: **Next.js** (자동 감지)
4. Root Directory: `bid-platform` (모노레포인 경우)

### 6.2 환경 변수 설정

Vercel → Project → **Settings** → **Environment Variables**:

| 변수명 | 환경 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Supabase anon key |
| `SUPABASE_URL` | Production, Preview | 서버 전용 런타임 Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Service role key |
| `CRON_SECRET` | Production | Cron 인증 시크릿 |
| `ADMIN_CONSOLE_EMAILS` | Production | `/settings/operations` 접근 허용 이메일 목록 (쉼표 구분) |
| `NARA_API_KEY` | Production | 나라장터 API 키 |
| `NARA_AWARD_API_KEY` | Production | 낙찰 수집 전용 키 (선택, 없으면 `NARA_API_KEY` fallback) |
| `NARA_API_BASE_URL` | All | `https://apis.data.go.kr/1230000` |
| `RESEND_API_KEY` | Production | Resend API 키 |
| `ALERT_FROM_EMAIL` | Production | 발신 이메일 주소 |
| `NEXT_PUBLIC_APP_URL` | Production | `https://your-domain.vercel.app` |
| `AI_SERVICE_URL` | Production | Railway 등 외부 AI 서비스 URL |
| `AI_SERVICE_API_KEY` | Production | AI 프록시 호출용 x-api-key |
| `STRIPE_SECRET_KEY` | Production | Stripe 서버 API 키 |
| `STRIPE_WEBHOOK_SECRET` | Production | Stripe webhook 서명 키 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production | Stripe 클라이언트 키 |
| `STRIPE_PRICE_PRO_MONTHLY` | Production | Pro 요금제 Price ID |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Production | Enterprise 요금제 Price ID |

### 6.3 Cron Jobs 설정

`vercel.json` 파일이 프로젝트 루트에 포함되어 있으면 자동 적용:

```json
{
  "crons": [
    {
      "path": "/api/jobs/cron-ingest",
      "schedule": "0 0 * * 1-5"
    },
    {
      "path": "/api/jobs/cron-maintenance",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- **현재 Hobby 운영안**: Cron 2개만 유지하고 내부에서 세부 Job을 순차 실행
- `cron-ingest`: 평일 공고 수집 + 낙찰 수집
- `cron-maintenance`: 알림 처리(평일) + 분석 재계산(매일) + 참여업체 수집(매일) + 임베딩 배치(월요일) + cleanup(일요일)
- 실제 `vercel.json` 기준 스케줄은 UTC `00:00`(평일 ingest), UTC `02:00`(매일 maintenance) 입니다.
- Vercel Hobby에서는 세부 Job을 개별 Cron으로 분리하지 않고 상위 오케스트레이터로 묶는 것을 기준으로 함
- Vercel이 자동으로 `Authorization: Bearer <CRON_SECRET>` 헤더를 추가하므로 내부 Job 호출도 동일 시크릿을 사용함
- 운영 기준에서 `cron-ingest` 는 현재 `/api/jobs/collect-bid-awards?lookbackDays=2&maxPages=1&maxItems=25` 경량 경로를 사용함
- 최신 프로덕션 검증 기준 응답 시간은 `cron-ingest` 약 23초, 경량 `collect-bid-awards` 직접 호출 약 7.6초였음
- 전체 award 범위를 한 번에 수집하는 방식은 여전히 장시간 실행 가능성이 있으므로, 데모 전에는 경량 운영안을 유지하는 편이 안전함

### 6.4 배포 실행

```bash
# Vercel CLI 사용 시
npx vercel --prod

# 또는 Git push → 자동 배포
git push origin main
```

### 6.5 배포 확인 체크리스트

- [ ] 메인 페이지 로딩 확인
- [ ] `/api/health` 응답 확인
- [ ] 회원가입 + 로그인 정상 동작
- [ ] 공고 목록 로딩 (데이터 수집 후)
- [ ] 즐겨찾기/알림 기능 (인증 후)
- [ ] Cron Job 실행 확인 (Vercel → Crons 탭)

---

## 7. 운영 모니터링

### 7.1 Vercel 대시보드

| 모니터링 항목 | 위치 |
|---|---|
| 배포 상태/로그 | Project → Deployments |
| 함수 실행 로그 | Project → Logs |
| Cron 실행 이력 | Project → Crons |
| 성능 메트릭 | Project → Analytics (Pro) |

### 7.2 Supabase 대시보드

| 모니터링 항목 | 위치 |
|---|---|
| DB 사용량/크기 | Project → Database → Reports |
| Auth 활동 | Project → Authentication → Users |
| API 요청 통계 | Project → Reports → API |
| 쿼리 성능 | Project → Database → Query Performance |

### 7.2.1 Cron 로그 확인 SQL

`collection_logs` 에서 최근 실행 상태를 직접 확인할 수 있습니다.

```sql
select job_type, status, started_at, finished_at, records_collected, error_message
from public.collection_logs
order by started_at desc
limit 20;
```

- `029_expand_collection_logs_for_cron.sql` 적용 후에는 `alerts`, `participants`, `cleanup`, `analysis_rebuild`, `backfill_awards` 도 함께 보여야 정상입니다.

### 7.3 수동 Cron 실행 (디버깅)

```bash
# poll-tenders 수동 실행
curl -X POST https://your-domain.vercel.app/api/jobs/poll-tenders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# process-alerts 수동 실행
curl -X POST https://your-domain.vercel.app/api/jobs/process-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 7.4 로그 확인

```bash
# Vercel CLI로 실시간 로그
npx vercel logs --follow

# 특정 함수 로그
npx vercel logs --follow --url /api/jobs/poll-tenders
```

---

## 8. 트러블슈팅

### 8.1 일반적인 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| 로그인 실패 | Supabase Auth URL 또는 anon key 오류 | `.env.local` 값 재확인 |
| 공고 목록 빈 화면 | DB 스키마 미적용 또는 데이터 없음 | SQL 실행 + poll-tenders 수동 호출 |
| Cron 401 에러 | `CRON_SECRET` 불일치 | Vercel 환경 변수 확인 |
| 이메일 미발송 | Resend API 키 오류 또는 도메인 미검증 | Resend 대시보드에서 키/도메인 확인 |
| RLS 에러 | 서비스 롤 키 누락 (Jobs) | `SUPABASE_SERVICE_ROLE_KEY` 확인 |
| 빌드 실패 | Node.js 버전 불일치 | `engines.node` 확인, Vercel Node 설정 |
| poll-tenders "Invalid API key" | DB 교체 후 `NEXT_PUBLIC_SUPABASE_URL` 빌드 타임 고정 — 구 URL vs 신 SERVICE_ROLE_KEY 불일치 | Vercel에 `SUPABASE_URL` 서버 전용 런타임 변수 추가 |
| `.env.local` 환경변수에 `\r\n` 포함 | Windows 줄바꿈 문자 리터럴 삽입 | 파일 직접 열어 수작업 제거 (`.trim()`으로 처리 불가) |
| Next.js `middleware` deprecation warning | Next.js 16에서 `middleware.ts` → `proxy.ts` 필요 | 파일명 `proxy.ts`, 함수명 `proxy()` 로 변경 |

### 8.2 나라장터 API 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| 빈 배열 반환 | API 키 미승인 또는 조회 기간 오류 | data.go.kr에서 승인 상태 확인 |
| 429 에러 | 일일 호출 횟수 초과 | 요금제 확인 또는 호출 간격 조정 |
| 500 에러 | 나라장터 서버 장애 | retryWithBackoff가 3회 재시도 처리 |
| 응답 구조 변경 | API 버전 업데이트 | `poll-tenders` 파싱 로직 수정 필요 |

### 8.3 데이터베이스 문제

```sql
-- 테이블 존재 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies WHERE schemaname = 'public';

-- 인덱스 확인
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' ORDER BY tablename;

-- 확장 확인
SELECT extname, extversion FROM pg_extension;
```

---

## 9. 백업 & 복구

### 9.1 Supabase 자동 백업

- **Free plan**: 일일 자동 백업 (7일 보관)
- **Pro plan**: PITR (Point-in-Time Recovery, 30일)

### 9.2 수동 백업

```bash
# pg_dump (Supabase connection string 필요)
pg_dump "postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres" \
  --data-only --no-owner > backup_$(date +%Y%m%d).sql
```

### 9.3 데이터 내보내기 (CSV)

Supabase Dashboard → **Table Editor** → 테이블 선택 → **Export as CSV**

---

## 10. 스케일링 고려사항

### 10.1 현재 한계 (MVP)

| 항목 | 현재 | 한계 |
|---|---|---|
| DB 크기 | Supabase Free 500MB | 공고 ~50만 건 |
| API 요청 | Vercel Hobby | 함수 100GB-hrs/월 |
| Cron 빈도 | 10분 간격 | Pro plan 필요 |
| 이메일 | Resend 100/일 | 사용자 수 증가 시 유료 전환 |

### 10.2 확장 경로

| 단계 | 전환 항목 | 비용 |
|---|---|---|
| Phase 1 | Vercel Pro + Supabase Pro | ~$45/월 |
| Phase 2 | 전용 DB + Rate Limiting | ~$100/월 |
| Phase 3 | Edge Functions + CDN | ~$200/월 |

---

## 11. 보안 체크리스트

- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 `NEXT_PUBLIC_`로 시작하지 않는지 확인
- [ ] `CRON_SECRET`이 충분히 긴 랜덤 문자열인지 확인 (최소 32자)
- [ ] Supabase → Auth → URL Configuration에 정확한 도메인 설정
- [ ] RLS가 모든 테이블에 활성화되어 있는지 확인
- [ ] `.env.local`이 `.gitignore`에 포함되어 있는지 확인
- [ ] Vercel 환경 변수에서 민감한 키가 Production에만 설정되어 있는지 확인
