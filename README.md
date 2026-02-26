# AI 입찰·조달 분석 플랫폼 MVP

> 나라장터/공공데이터 기반 입찰 공고 수집 → 검색/필터 → 즐겨찾기 → 알림 → 리포트 플랫폼

---

## 가정 사항

| # | 가정 | 비고 |
|---|------|------|
| 1 | 나라장터 API(`apis.data.go.kr/1230000`)의 JSON 응답을 기반으로 수집 | API 스펙 변경 시 `poll-tenders` Route만 수정 |
| 2 | Supabase 프로젝트가 생성되어 있고 `pg_trgm` 확장 활성화 가능 | Supabase Dashboard → SQL Editor에서 스키마 실행 |
| 3 | MVP에서 `awards ↔ tenders`는 1:1 관계 | 고도화 시 1:N 전환 |
| 4 | Kakao 알림톡은 모킹(콘솔 로그)만 구현 | Provider 인터페이스 교체로 실발송 전환 |
| 5 | Vercel Pro 플랜 권장 (Cron 최소 1분 단위) | Free 플랜은 일 1회 |

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| UI | shadcn/ui + TailwindCSS v4 |
| State | TanStack Query v5 |
| Validation | Zod + React Hook Form |
| Auth | Supabase Auth |
| DB | Supabase Postgres + RLS |
| Email | Resend |
| Cron | Vercel Cron |
| Deploy | Vercel + Supabase |

---

## 폴더 구조

```
bid-platform/
├── docs/
│   └── ENHANCEMENT_ROADMAP.md      # 고도화 로드맵
├── supabase/
│   └── schema.sql                   # DB 스키마 (테이블 + 인덱스 + RLS)
├── src/
│   ├── app/
│   │   ├── layout.tsx               # 루트 레이아웃
│   │   ├── login/page.tsx           # 로그인/회원가입
│   │   ├── (app)/
│   │   │   ├── layout.tsx           # 앱 레이아웃 (Header + Footer)
│   │   │   ├── page.tsx             # 메인: 공고 리스트 (검색/필터)
│   │   │   ├── tenders/[id]/page.tsx # 공고 상세
│   │   │   ├── favorites/page.tsx   # 즐겨찾기
│   │   │   ├── alerts/page.tsx      # 알림 관리
│   │   │   └── reports/page.tsx     # 리포트
│   │   └── api/
│   │       ├── auth/{signup,signin,signout}/route.ts
│   │       ├── tenders/route.ts     # GET 공고 리스트
│   │       ├── tenders/[id]/route.ts # GET 공고 상세
│   │       ├── favorites/route.ts   # GET 즐겨찾기 목록
│   │       ├── favorites/[tenderId]/route.ts # POST/DELETE
│   │       ├── alerts/rules/route.ts # GET/POST 알림 규칙
│   │       ├── alerts/rules/[id]/route.ts # PATCH/DELETE
│   │       ├── alerts/logs/route.ts # GET 발송 이력
│   │       ├── reports/summary/route.ts # GET 리포트
│   │       ├── jobs/poll-tenders/route.ts # 수집 Job
│   │       ├── jobs/process-alerts/route.ts # 알림 발송 Job
│   │       └── health/route.ts
│   ├── components/
│   │   ├── ui/                      # shadcn/ui 컴포넌트
│   │   ├── header.tsx               # 네비게이션 헤더
│   │   └── providers.tsx            # QueryClient + Toaster
│   ├── hooks/
│   │   └── use-api.ts               # TanStack Query 커스텀 훅
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # 브라우저 클라이언트
│   │   │   ├── server.ts            # 서버 클라이언트 (SSR)
│   │   │   └── service.ts           # 서비스 롤 클라이언트
│   │   ├── notifications/
│   │   │   ├── types.ts             # Provider 인터페이스
│   │   │   ├── email-provider.ts    # Resend 이메일
│   │   │   ├── kakao-provider.ts    # 카카오 모킹
│   │   │   └── index.ts             # Provider 팩토리
│   │   ├── api-response.ts          # 통일 에러 포맷
│   │   ├── auth-context.ts          # 서버 인증 헬퍼
│   │   ├── helpers.ts               # 유틸 함수
│   │   ├── types.ts                 # 도메인 타입
│   │   └── validations.ts           # Zod 스키마
│   └── middleware.ts                # 인증 미들웨어
├── vercel.json                      # Cron 설정
├── .env.example
└── .env.local
```

---

## 시작하기

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Project Settings에서 URL, anon key, service role key 확보

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase 키, 나라장터 API 키 등 입력

### 3. 의존성 설치 & 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인

### 4. Cron 테스트 (로컬)

```bash
# 공고 수집 (시크릿 키 포함)
curl -X POST http://localhost:3000/api/jobs/poll-tenders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 알림 발송
curl -X POST http://localhost:3000/api/jobs/process-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Vercel 배포

1. Vercel에 GitHub 레포 연결
2. 환경변수 설정 (`.env.example` 참고)
3. `vercel.json` 의 Cron이 자동 등록됨
4. Cron Secret은 Vercel 환경변수 `CRON_SECRET`으로 설정

---

## API 명세 요약

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| POST | `/api/auth/signup` | 회원가입 + org 생성 | ❌ |
| POST | `/api/auth/signin` | 로그인 | ❌ |
| POST | `/api/auth/signout` | 로그아웃 | ✅ |
| GET | `/api/tenders` | 공고 리스트 (필터/정렬/페이지) | ❌ |
| GET | `/api/tenders/:id` | 공고 상세 + awards | ❌ |
| GET | `/api/favorites` | 즐겨찾기 목록 | ✅ |
| POST | `/api/favorites/:tenderId` | 즐겨찾기 추가 | ✅ |
| DELETE | `/api/favorites/:tenderId` | 즐겨찾기 삭제 | ✅ |
| GET | `/api/alerts/rules` | 알림 규칙 목록 | ✅ |
| POST | `/api/alerts/rules` | 알림 규칙 생성 | ✅ |
| PATCH | `/api/alerts/rules/:id` | 알림 규칙 수정 | ✅ |
| DELETE | `/api/alerts/rules/:id` | 알림 규칙 삭제 | ✅ |
| GET | `/api/alerts/logs` | 발송 이력 | ✅ |
| GET | `/api/reports/summary` | 리포트 (기간별) | ❌ |
| POST | `/api/jobs/poll-tenders` | 공고 수집 (Cron) | 🔑 |
| POST | `/api/jobs/process-alerts` | 알림 발송 (Cron) | 🔑 |

> 🔑 = `Authorization: Bearer {CRON_SECRET}` 필요

---

## 에러 응답 형식

```json
{
  "code": "VALIDATION_ERROR",
  "message": "잘못된 쿼리 파라미터",
  "details": { ... }
}
```

---

## 라이센스

MIT
