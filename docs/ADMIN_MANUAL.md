# BidSight 관리자 매뉴얼

> **BidSight — AI 입찰·조달 분석 플랫폼**  
> 버전: 1.0 | 작성일: 2026-03-01  
> 대상: 시스템 관리자 / DevOps / 운영팀

---

## 목차

1. [시스템 아키텍처](#1-시스템-아키텍처)
2. [인프라 구성 및 접근 정보](#2-인프라-구성-및-접근-정보)
3. [환경 변수 관리](#3-환경-변수-관리)
4. [배포 프로세스](#4-배포-프로세스)
5. [로컬 개발 환경 설정](#5-로컬-개발-환경-설정)
6. [데이터베이스 관리](#6-데이터베이스-관리)
7. [API 엔드포인트 레퍼런스](#7-api-엔드포인트-레퍼런스)
8. [Cron Job 관리](#8-cron-job-관리)
9. [사용자 계정 관리](#9-사용자-계정-관리)
10. [모니터링 및 알림](#10-모니터링-및-알림)
11. [데모 데이터 관리](#11-데모-데이터-관리)
12. [보안 및 접근 관리](#12-보안-및-접근-관리)
13. [장애 대응 가이드](#13-장애-대응-가이드)
14. [백업 및 복구](#14-백업-및-복구)

---

## 1. 시스템 아키텍처

### 1.1 전체 구조

```
┌──────────────┐     HTTPS      ┌──────────────────────────┐
│  사용자 브라우저  │  ──────────▶  │  Vercel Edge Network       │
└──────────────┘               │  (Next.js App Router)      │
                                │  https://bid-platform.vercel.app │
                                └────────────┬─────────────┘
                                             │
                    ┌────────────────────────┤
                    │                        │
                    ▼                        ▼
        ┌───────────────────┐    ┌────────────────────────┐
        │  Supabase (Seoul) │    │  외부 API               │
        │  - PostgreSQL DB  │    │  - 나라장터 G2B API      │
        │  - Auth Service   │    │  (공공데이터포털)         │
        │  - RLS 정책        │    └────────────────────────┘
        └───────────────────┘
```

### 1.2 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 언어 | TypeScript | 5.x |
| UI | React | 19.x |
| 스타일 | Tailwind CSS | v4 |
| 컴포넌트 | shadcn/ui (Radix UI) | 최신 |
| 상태 관리 | TanStack Query | v5 |
| DB | PostgreSQL (Supabase) | 15.x |
| 인증 | Supabase Auth | 최신 |
| 배포 | Vercel | Hobby Plan |

---

## 2. 인프라 구성 및 접근 정보

### 2.1 서비스 현황

| 서비스 | URL / ID | 비고 |
|--------|----------|------|
| Production | https://bid-platform.vercel.app | Vercel 자동 배포 |
| Supabase 프로젝트 | `pdxjwpskwiinustgzhmb` | Seoul 리전 |
| Supabase Dashboard | https://supabase.com/dashboard/project/pdxjwpskwiinustgzhmb | 관리 콘솔 |
| Vercel Dashboard | https://vercel.com/dashboard | 배포 관리 |
| GitHub | https://github.com/mxten777/vscode_project_10 | 소스 코드 |

### 2.2 Supabase 접속 정보

| 항목 | 값 |
|------|-----|
| Project URL | `https://pdxjwpskwiinustgzhmb.supabase.co` |
| Anon Key | Supabase Dashboard > Settings > API |
| Service Role Key | `.env.local` 파일 참조 (비공개) |
| DB 연결 (Direct) | Supabase Dashboard > Settings > Database |
| DB 연결 (Pooler) | Transaction Mode 권장 (서버리스 환경) |

> ⚠️ **Service Role Key는 절대 클라이언트 코드에 노출하지 않습니다.** 서버사이드 API에서만 사용합니다.

---

## 3. 환경 변수 관리

### 3.1 로컬 환경 (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://pdxjwpskwiinustgzhmb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# 나라장터 G2B API (공공데이터포털)
NARA_API_KEY=<encoding_key_url_encoded>

# Cron 보안 토큰
CRON_SECRET=<random_256bit_hex>

# 이메일 발송 (선택)
EMAIL_FROM=no-reply@bidsight.co.kr
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<smtp_user>
SMTP_PASS=<smtp_password>

# 카카오 알림톡 (선택)
KAKAO_API_KEY=<kakao_api_key>
```

### 3.2 Vercel 환경 변수 설정

1. [Vercel Dashboard](https://vercel.com/dashboard) → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 위 항목들을 **Production / Preview / Development** 환경에 각각 등록

> `NEXT_PUBLIC_` 접두사 변수는 클라이언트에 노출됩니다. Anon Key만 해당하며 민감 정보는 절대 사용하지 않습니다.

### 3.3 환경 변수 교체 절차

1. Supabase Dashboard에서 새 키 발급 (Key rotation)
2. `.env.local` 업데이트
3. Vercel Environment Variables 업데이트
4. Vercel에서 **Redeploy** → 새 키 적용 완료

---

## 4. 배포 프로세스

### 4.1 자동 배포 (CD)

- `main` / `master` 브랜치에 Push 시 **Vercel이 자동으로 빌드·배포**합니다.
- PR(Pull Request) 생성 시 Preview URL 자동 생성됩니다.

```bash
# 코드 변경 후 배포
git add -A
git commit -m "feat: ..."
git push origin master
# → Vercel이 자동으로 빌드 시작
```

### 4.2 배포 상태 확인

- Vercel Dashboard → **Deployments** 탭
- 빌드 로그는 각 Deployment 상세에서 확인

### 4.3 롤백

1. Vercel Dashboard → **Deployments**
2. 이전 정상 배포를 선택
3. **Promote to Production** 클릭 → 즉시 이전 버전으로 복구

### 4.4 빌드 명령어

```bash
# 로컬 빌드 테스트
cd bid-platform
npm install
npm run build

# 타입 체크
npm run type-check   # 또는 npx tsc --noEmit

# 린트 검사
npm run lint
```

### 4.5 빌드 오류 시 체크리스트

- [ ] `package.json` 의존성 일치 여부 (`npm ci`)
- [ ] TypeScript 타입 오류 (`npx tsc --noEmit`)
- [ ] 환경 변수 누락 여부
- [ ] Supabase 스키마 마이그레이션 적용 여부

---

## 5. 로컬 개발 환경 설정

### 5.1 사전 요구사항

| 도구 | 최소 버전 | 설치 방법 |
|------|----------|----------|
| Node.js | 20.x LTS | https://nodejs.org |
| npm | 10.x | Node.js 포함 |
| Git | 2.40+ | https://git-scm.com |

### 5.2 초기 설정

```bash
# 1. 저장소 클론
git clone https://github.com/mxten777/vscode_project_10.git
cd vscode_project_10/bid-platform

# 2. 의존성 설치
npm install

# 3. 환경 변수 파일 생성
copy .env.example .env.local   # Windows
cp .env.example .env.local     # macOS/Linux

# 4. .env.local 편집 후 키 값 입력

# 5. 개발 서버 시작
npm run dev
# → http://localhost:3000
```

### 5.3 디렉토리 구조

```
bid-platform/
├── src/
│   ├── app/
│   │   ├── (app)/          # 인증 필요 페이지
│   │   │   ├── page.tsx    # 메인 대시보드
│   │   │   ├── tenders/    # 공고 상세
│   │   │   ├── favorites/  # 즐겨찾기
│   │   │   ├── alerts/     # 알림 관리
│   │   │   └── reports/    # 리포트
│   │   ├── api/            # API Route Handlers
│   │   │   ├── auth/       # 인증 API
│   │   │   ├── tenders/    # 공고 API
│   │   │   ├── favorites/  # 즐겨찾기 API
│   │   │   ├── alerts/     # 알림 API
│   │   │   ├── reports/    # 리포트 API
│   │   │   ├── jobs/       # Cron Job API
│   │   │   └── health/     # 헬스체크
│   │   ├── login/          # 로그인 페이지
│   │   └── globals.css     # 전역 스타일
│   ├── components/         # 공통 컴포넌트
│   ├── hooks/              # React Query 훅
│   ├── lib/                # 유틸리티·타입
│   └── middleware.ts        # 인증 미들웨어 (라우트 보호)
├── supabase/
│   └── schema.sql          # DB 스키마 전체
├── scripts/
│   └── seed-demo.mjs       # 데모 데이터 시드 스크립트
├── docs/                   # 프로젝트 문서
├── .env.local              # (비공개) 환경 변수
├── next.config.ts
├── tsconfig.json
└── vercel.json             # Vercel 배포 설정 (Cron 포함)
```

---

## 6. 데이터베이스 관리

### 6.1 스키마 개요

```sql
-- 8개 주요 테이블
orgs            -- 조직 (회사)
org_members     -- 조직 멤버십 (user → org)
agencies        -- 발주 기관 (나라장터 기관 목록)
tenders         -- 입찰 공고 (핵심 테이블)
awards          -- 낙찰 결과
favorites       -- 즐겨찾기 (user × tender)
alert_rules     -- 알림 규칙
alert_logs      -- 알림 발송 이력
```

### 6.2 스키마 마이그레이션

```bash
# Supabase Dashboard > SQL Editor 에서 직접 실행
# 또는 supabase CLI 사용 (설치 시)

# 새 마이그레이션 파일 실행
supabase db push

# 또는 SQL Editor에서 supabase/schema.sql 수동 실행
```

### 6.3 tenders 테이블 주요 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 기본 키 |
| `notice_id` | TEXT UNIQUE | 나라장터 공고번호 |
| `title` | TEXT | 공고명 |
| `agency_id` | UUID | 발주 기관 FK |
| `budget` | NUMERIC | 추정 예산 (원) |
| `status` | ENUM | `OPEN` / `CLOSED` / `RESULT` |
| `published_at` | TIMESTAMPTZ | 게시일 |
| `deadline_at` | TIMESTAMPTZ | 마감일 |
| `category` | TEXT | 업종 분류 |
| `source_url` | TEXT | 나라장터 원문 URL |

### 6.4 Row Level Security (RLS)

모든 테이블에 RLS가 적용되어 있습니다.

| 테이블 | 정책 |
|--------|------|
| `tenders`, `agencies`, `awards` | 누구든지 SELECT 가능 (공개 데이터) |
| `favorites` | 본인 레코드만 SELECT/INSERT/DELETE |
| `alert_rules`, `alert_logs` | 본인 org 데이터만 접근 |
| `orgs`, `org_members` | 본인 org 데이터만 접근 |

> Service Role Key를 사용하면 RLS를 우회하여 모든 데이터에 접근할 수 있습니다. 관리자 스크립트에서만 사용합니다.

### 6.5 유용한 관리 쿼리

```sql
-- 전체 공고 수 확인
SELECT status, COUNT(*) FROM tenders GROUP BY status;

-- 최근 7일 수집 공고
SELECT title, published_at FROM tenders
WHERE published_at > NOW() - INTERVAL '7 days'
ORDER BY published_at DESC;

-- 알림 발송 이력 최근 50건
SELECT al.sent_at, ar.name as rule_name, t.title as tender_title
FROM alert_logs al
JOIN alert_rules ar ON al.rule_id = ar.id
JOIN tenders t ON al.tender_id = t.id
ORDER BY al.sent_at DESC LIMIT 50;

-- 오늘 마감 공고
SELECT title, deadline_at, budget FROM tenders
WHERE deadline_at::date = CURRENT_DATE AND status = 'OPEN';

-- 이번 달 낙찰 통계
SELECT a.company_name, COUNT(*) as wins, SUM(a.amount) as total_amount
FROM awards a
JOIN tenders t ON a.tender_id = t.id
WHERE t.deadline_at >= DATE_TRUNC('month', NOW())
GROUP BY a.company_name ORDER BY wins DESC LIMIT 20;
```

---

## 7. API 엔드포인트 레퍼런스

### 7.1 인증 API

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|----------|
| POST | `/api/auth/signup` | 회원가입 | ❌ |
| POST | `/api/auth/signin` | 로그인 | ❌ |
| POST | `/api/auth/signout` | 로그아웃 | ✅ |

### 7.2 공고 API

| 메서드 | 엔드포인트 | 설명 | 주요 파라미터 |
|--------|-----------|------|-------------|
| GET | `/api/tenders` | 공고 목록 | `q`, `agency`, `status`, `minBudget`, `maxBudget`, `from`, `to`, `page`, `pageSize` |
| GET | `/api/tenders/[id]` | 공고 상세 | - |

**예시 요청:**
```
GET /api/tenders?q=AI&status=OPEN&page=1&pageSize=10
GET /api/tenders?minBudget=10000000&maxBudget=100000000
```

**응답 형식:**
```json
{
  "data": [ { ...tender } ],
  "total": 38,
  "page": 1,
  "pageSize": 10
}
```

### 7.3 즐겨찾기 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/favorites` | 즐겨찾기 목록 |
| POST | `/api/favorites/[tenderId]` | 즐겨찾기 추가 |
| DELETE | `/api/favorites/[tenderId]` | 즐겨찾기 삭제 |

### 7.4 알림 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/alerts/rules` | 알림 규칙 목록 |
| POST | `/api/alerts/rules` | 알림 규칙 생성 |
| GET | `/api/alerts/rules/[id]` | 알림 규칙 상세 |
| PUT | `/api/alerts/rules/[id]` | 알림 규칙 수정 |
| DELETE | `/api/alerts/rules/[id]` | 알림 규칙 삭제 |
| GET | `/api/alerts/logs` | 알림 발송 이력 |

### 7.5 리포트 API

| 메서드 | 엔드포인트 | 설명 | 파라미터 |
|--------|-----------|------|---------|
| GET | `/api/reports/summary` | 집계 통계 | `from`, `to` |

### 7.6 시스템 API

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/api/health` | 헬스체크 | ❌ |
| POST | `/api/jobs/poll-tenders` | 나라장터 공고 수집 | CRON_SECRET |
| POST | `/api/jobs/process-alerts` | 알림 규칙 처리 | CRON_SECRET |

---

## 8. Cron Job 관리

### 8.1 설정 위치

`vercel.json` 파일에서 Cron 스케줄을 관리합니다:

```json
{
  "crons": [
    {
      "path": "/api/jobs/poll-tenders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/jobs/process-alerts",
      "schedule": "15 * * * *"
    }
  ]
}
```

| Job | 스케줄 | 설명 |
|-----|--------|------|
| `poll-tenders` | 매시 정각 | 나라장터 API에서 신규 공고 수집 |
| `process-alerts` | 매시 15분 | 알림 규칙과 신규 공고 매칭 후 발송 |

### 8.2 수동 Job 실행

```bash
# 나라장터 공고 수집 수동 실행
curl -X POST https://bid-platform.vercel.app/api/jobs/poll-tenders \
  -H "Authorization: Bearer <CRON_SECRET>"

# 알림 처리 수동 실행
curl -X POST https://bid-platform.vercel.app/api/jobs/process-alerts \
  -H "Authorization: Bearer <CRON_SECRET>"

# 로컬에서 테스트
curl -X POST http://localhost:3000/api/jobs/poll-tenders \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### 8.3 Cron 실행 이력 확인

- Vercel Dashboard → **Logs** → `cron` 태그 필터

### 8.4 CRON_SECRET 교체 방법

1. 새 랜덤 시크릿 생성:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. `.env.local` 및 Vercel 환경 변수 업데이트
3. Vercel Redeploy (환경 변수 변경은 재배포 필요)

---

## 9. 사용자 계정 관리

### 9.1 Supabase Auth 콘솔 접근

1. [Supabase Dashboard](https://supabase.com/dashboard/project/pdxjwpskwiinustgzhmb) → **Authentication** → **Users**

### 9.2 사용자 관리 작업

| 작업 | 방법 |
|------|------|
| 사용자 목록 조회 | Dashboard → Authentication → Users |
| 사용자 삭제 | Users 목록 → 해당 사용자 클릭 → Delete User |
| 이메일 인증 강제 완료 | Users → Confirm email |
| 비밀번호 초기화 발송 | Dashboard > SQL Editor에서 `auth.users` 조회 후 처리 |
| 신규 사용자 생성 | Dashboard → Authentication → Users → Add user |

### 9.3 조직(Org) 관리

모든 사용자는 조직에 속해야 합니다. 신규 가입 시 자동으로 개인 조직이 생성됩니다.

```sql
-- 조직 목록 조회
SELECT o.id, o.name, COUNT(om.user_id) as member_count
FROM orgs o
LEFT JOIN org_members om ON o.id = om.org_id
GROUP BY o.id, o.name;

-- 특정 사용자의 조직 확인
SELECT o.name, om.role
FROM org_members om
JOIN orgs o ON om.org_id = o.id
WHERE om.user_id = '<user_uuid>';
```

---

## 10. 모니터링 및 알림

### 10.1 헬스체크

```bash
# 서비스 상태 확인
curl https://bid-platform.vercel.app/api/health

# 정상 응답
{ "status": "ok", "timestamp": "2026-03-01T00:00:00Z" }
```

### 10.2 Vercel 모니터링

| 지표 | 확인 위치 |
|------|----------|
| 요청 수 / 오류율 | Vercel Dashboard → Analytics |
| 응답 시간 | Vercel Dashboard → Speed Insights |
| 빌드 로그 | Deployments → 각 배포 상세 |
| 런타임 로그 | Vercel Dashboard → Logs |
| Cron 실행 이력 | Logs → `source:cron` 필터 |

### 10.3 Supabase 모니터링

| 지표 | 확인 위치 |
|------|----------|
| DB 연결 수 | Dashboard → Reports → Database |
| 쿼리 성능 | Dashboard → Reports → Query Performance |
| 스토리지 사용량 | Dashboard → Storage |
| Auth 이벤트 | Dashboard → Authentication → Logs |
| API 요청 수 | Dashboard → Reports → API |

### 10.4 주요 에러 코드

| 코드 | 의미 | 조치 |
|------|------|------|
| 401 | 인증 실패 | JWT 만료 여부 확인, 재로그인 안내 |
| 403 | 권한 없음 | RLS 정책 또는 org 멤버십 확인 |
| 429 | Rate limit 초과 | 나라장터 API 또는 Supabase 한도 확인 |
| 500 | 서버 오류 | Vercel/Supabase 로그 확인 |
| 503 | 서비스 불가 | Supabase/Vercel 상태 페이지 확인 |

### 10.5 서비스 상태 페이지

- Vercel: https://www.vercelstatus.com
- Supabase: https://status.supabase.com

---

## 11. 데모 데이터 관리

### 11.1 데모 데이터 시드 실행

```bash
cd bid-platform
node scripts/seed-demo.mjs
```

실행 결과:
- 15개 발주 기관 (agencies)
- 35건 입찰 공고 (tenders: OPEN 15 / CLOSED 10 / RESULT 10)
- 10건 낙찰 결과 (awards)

### 11.2 데모 데이터 초기화

```sql
-- Supabase SQL Editor에서 실행
-- (주의: 실 데이터도 삭제됩니다)
DELETE FROM awards;
DELETE FROM favorites;
DELETE FROM tenders;
DELETE FROM agencies;
```

### 11.3 나라장터 실 데이터 수집

```bash
# poll-tenders Job 수동 실행으로 실 데이터 수집
curl -X POST http://localhost:3000/api/jobs/poll-tenders \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

---

## 12. 보안 및 접근 관리

### 12.1 보안 원칙

| 원칙 | 구현 방법 |
|------|----------|
| 인증 필요 페이지 보호 | `src/middleware.ts` — 비로그인 시 `/login` 리다이렉트 |
| DB Row 수준 보안 | Supabase RLS — 본인 데이터만 접근 |
| API 인증 | Supabase JWT 검증 (`createClient` 서버사이드) |
| Cron 보호 | `Authorization: Bearer <CRON_SECRET>` 헤더 검증 |
| 환경 변수 | `.env.local` — Git 미추적, Vercel 서버 전용 저장 |

### 12.2 미들웨어 라우트 보호

`src/middleware.ts` 에서 인증 필요 경로를 설정합니다:

```typescript
// 보호되는 경로 (로그인 필요)
const protectedPaths = ['/', '/tenders', '/favorites', '/alerts', '/reports'];

// 공개 경로
const publicPaths = ['/login', '/api/auth'];
```

### 12.3 정기 보안 점검 체크리스트

- [ ] Supabase RLS 정책 정상 작동 확인
- [ ] 환경 변수 키 로테이션 (분기 1회)
- [ ] CRON_SECRET 갱신 (분기 1회)
- [ ] Supabase 사용자 목록 검토 (비정상 계정 삭제)
- [ ] Vercel 배포 로그 오류 검토
- [ ] 의존성 보안 취약점 스캔: `npm audit`

### 12.4 Git 보안

```bash
# .gitignore 확인 — 아래 파일들이 반드시 제외되어야 함
.env.local
.env*.local
node_modules/
.next/
```

> 실수로 시크릿이 커밋된 경우 즉시 해당 키를 무효화하고 새 키를 발급해야 합니다.

---

## 13. 장애 대응 가이드

### 13.1 서비스 접속 불가

```
1. https://www.vercelstatus.com 확인 (Vercel 장애 여부)
2. https://status.supabase.com 확인 (Supabase 장애 여부)
3. Vercel Dashboard → 최근 배포 빌드 오류 확인
4. /api/health 응답 코드 확인
5. Vercel Logs → 런타임 오류 확인
```

### 13.2 로그인 불가

```
1. Supabase Auth 로그 확인 (Dashboard → Auth → Logs)
2. NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수 확인
3. 사용자 이메일 인증 여부 확인 (Dashboard → Auth → Users)
4. Supabase Auth 서비스 상태 확인
```

### 13.3 공고 데이터 미수집

```
1. /api/jobs/poll-tenders 수동 실행 및 응답 확인
2. NARA_API_KEY 유효성 확인 (공공데이터포털 → 마이페이지 → 활용신청)
3. 나라장터 API 사용량 한도 확인
4. Vercel Cron 실행 이력 확인 (Logs → cron 필터)
5. API 오류 로그 확인
```

### 13.4 알림 미발송

```
1. alert_rules 테이블에 활성화된 규칙 확인
2. /api/jobs/process-alerts 수동 실행
3. 이메일 설정 (SMTP_HOST 등) 환경 변수 확인
4. alert_logs 테이블에 실패 레코드 있는지 확인
5. 이메일 발송 서비스 (SendGrid/SMTP) 상태 확인
```

### 13.5 빌드 실패

```bash
# 로컬에서 빌드 재현
cd bid-platform
npm ci
npm run build

# 일반적인 원인:
# - TypeScript 타입 오류 → npx tsc --noEmit
# - 환경 변수 누락 → .env.local 확인
# - 의존성 충돌 → npm ci --legacy-peer-deps
```

---

## 14. 백업 및 복구

### 14.1 자동 백업

Supabase Hobby/Pro Plan에서 **자동 백업**이 제공됩니다:

| 플랜 | 백업 주기 | 보관 기간 |
|------|---------|---------|
| Free | 없음 | - |
| Pro | 매일 | 7일 |
| Team | 매일 | 14일 |

> 현재 Hobby(Free) 플랜 사용 중이므로 자동 백업이 없습니다. 수동 백업을 권장합니다.

### 14.2 수동 데이터 백업

```bash
# Supabase CLI 사용 (로컬 DB 덤프)
supabase db dump -f backup_$(date +%Y%m%d).sql

# 또는 Supabase Dashboard → Settings → Database → Backups (Pro 이상)
```

### 14.3 주요 데이터 CSV 내보내기

```sql
-- Supabase SQL Editor에서 실행 후 다운로드
COPY (SELECT * FROM tenders) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM agencies) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM awards) TO STDOUT WITH CSV HEADER;
```

### 14.4 복구 절차

```bash
# 백업 파일로 복구 (주의: 기존 데이터 덮어쓰기)
psql <connection_string> < backup_20260301.sql
```

### 14.5 코드 백업

- GitHub 저장소: https://github.com/mxten777/vscode_project_10
- 모든 코드 변경은 Git으로 관리되며 GitHub에 Push하여 백업합니다.

```bash
# 최신 상태 원격 저장소에 백업
git push origin master
```

---

## 운영 담당자 연락처

| 역할 | 담당자 | 연락처 |
|------|--------|--------|
| 시스템 관리자 | 개발팀 | admin@bidsight.co.kr |
| Vercel 계정 관리 | DevOps | devops@bidsight.co.kr |
| Supabase 계정 관리 | DevOps | devops@bidsight.co.kr |

---

## 관련 문서

| 문서 | 경로 |
|------|------|
| API 명세서 | `docs/API_SPECIFICATION.md` |
| DB 스키마 | `docs/DATABASE_SCHEMA.md` |
| 아키텍처 | `docs/ARCHITECTURE.md` |
| 개발 가이드 | `docs/DEVELOPMENT_GUIDE.md` |
| 배포 가이드 | `docs/DEPLOYMENT_GUIDE.md` |
| Supabase 가이드 | `docs/SUPABASE_GUIDE.md` |
| 사용자 매뉴얼 | `docs/USER_MANUAL.md` |

---

*© 2026 BidSight — AI 입찰·조달 분석 플랫폼 | 관리자 전용 문서*
