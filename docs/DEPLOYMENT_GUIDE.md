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

1. Dashboard → **SQL Editor** → **New Query**
2. `supabase/schema.sql` 파일의 전체 내용을 붙여넣기
3. **Run** 클릭
4. **Table Editor**에서 8개 테이블 생성 확인:
   - `orgs`, `org_members`, `agencies`, `tenders`, `awards`, `favorites`, `alert_rules`, `alert_logs`

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

# ── 나라장터 API ──
NARA_API_KEY=your-data.go.kr-api-key
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
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Service role key |
| `CRON_SECRET` | Production | Cron 인증 시크릿 |
| `NARA_API_KEY` | Production | 나라장터 API 키 |
| `NARA_API_BASE_URL` | All | `https://apis.data.go.kr/1230000` |
| `RESEND_API_KEY` | Production | Resend API 키 |
| `ALERT_FROM_EMAIL` | Production | 발신 이메일 주소 |
| `NEXT_PUBLIC_APP_URL` | Production | `https://your-domain.vercel.app` |

### 6.3 Cron Jobs 설정

`vercel.json` 파일이 프로젝트 루트에 포함되어 있으면 자동 적용:

```json
{
  "crons": [
    {
      "path": "/api/jobs/poll-tenders",
      "schedule": "0 9 * * 1-5"
    },
    {
      "path": "/api/jobs/process-alerts",
      "schedule": "30 9 * * 1-5"
    }
  ]
}
```

- **현재 스케줄**: 평일 09:00 UTC (poll) / 09:30 UTC (alerts)
- **Hobby plan 제한**: 24시간당 1회 (Cron 표현식과 무관하게)
- **Pro plan 업그레이드 시**: `*/10 * * * *` (medium미늹 수집)\ub85c 변경 가능
- Vercel이 자동으로 `Authorization: Bearer <CRON_SECRET>` 헤더 추가

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
