# 🏢 AI 입찰·조달 분석 플랫폼

<div align="center">

**나라장터 입찰 공고를 자동으로 수집·분석하고, 맞춤 알림을 제공하는 SaaS 플랫폼**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8)](https://tailwindcss.com/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com)

</div>

---

## 📖 프로젝트 소개

공공 입찰 시장에 참여하는 기업과 컨설턴트를 위한 **올인원 입찰 정보 플랫폼**입니다.

### 🎯 핵심 기능

- **🔄 자동 수집**: 나라장터 API 기반 실시간 공고 수집 (Vercel Cron)
- **🔍 고급 검색**: 키워드, 지역, 업종, 예산 범위 다중 필터링
- **⭐ 즐겨찾기**: 관심 공고 북마크 및 빠른 접근
- **🔔 맞춤 알림**: 조건별 알림 규칙 생성 → 이메일/카카오 자동 발송
- **📊 통계 리포트**: 기관별/업종별 입찰 동향 분석
- **🔒 보안**: Supabase Auth + RLS 기반 멀티테넌시 지원

### 🚀 기술적 하이라이트

- **API-First 아키텍처**: 모바일 앱 확장 준비 완료
- **Postgres-First**: pg_trgm 인덱스로 별도 검색 엔진 불필요
- **멱등성 보장**: Upsert 기반 중복 방지 설계
- **확장 가능**: Provider 패턴으로 알림 채널 추가 용이

---

## 📚 문서

| 문서 | 설명 |
|------|------|
| [🏗️ 아키텍처](docs/ARCHITECTURE.md) | 시스템 설계 및 기술 스택 상세 |
| [📡 API 명세서](docs/API_SPECIFICATION.md) | REST API 엔드포인트 및 스키마 |
| [💾 데이터베이스](docs/DATABASE_SCHEMA.md) | 테이블 구조 및 RLS 정책 |
| [🚢 배포 가이드](docs/DEPLOYMENT_GUIDE.md) | Vercel + Supabase 배포 절차 |
| [🎨 UI 설계](docs/UI_DESIGN.md) | 화면 구조 및 컴포넌트 명세 |
| [🛣️ 로드맵](docs/ENHANCEMENT_ROADMAP.md) | 향후 확장 계획 |

---

## 🛠️ 기술 스택

### Frontend
- **Next.js 16** (App Router) - SSR/SSG 하이브리드 렌더링
- **TailwindCSS v4** + **shadcn/ui** - 프로페셔널 디자인 시스템
- **TanStack Query v5** - 효율적인 서버 상태 관리
- **TypeScript** - 타입 안전성 보장

### Backend
- **Supabase** - Auth + PostgreSQL + RLS 통합 솔루션
- **Next.js API Routes** - 서버리스 API 핸들러
- **Zod** - 런타임 타입 검증
- **Vercel Cron** - 스케줄링 자동화

### External Services
- **나라장터 API** - 공공데이터포털 입찰 정보
- **Resend** - 트랜잭션 이메일 발송
- **pg_trgm** - 한국어 부분 매칭 검색

---

## 🔧 주요 가정 및 제약사항

| 항목 | 내용 | 참고 |
|------|------|------|
| 데이터 소스 | 나라장터 API (`apis.data.go.kr/1230000`) | API 변경 시 `poll-tenders` 라우트만 수정 |
| 검색 엔진 | PostgreSQL `pg_trgm` 확장 필요 | Supabase Dashboard에서 활성화 |
| 낙찰 정보 | MVP에서 1:1 관계 (tender ↔ award) | 향후 1:N 관계로 확장 가능 |
| 카카오 알림 | Mock 구현 (console.log) | Provider 인터페이스 교체로 실발송 전환 |
| Vercel 플랜 | Hobby 플랜 (Cron 1일 1회) | Pro 플랜 권장 (분 단위 실행) |

---

## 📂 프로젝트 구조

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

## 🚀 빠른 시작

### 1️⃣ 사전 준비

#### Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor**에서 `supabase/schema.sql` 전체 실행
3. **Database > Extensions**에서 `pg_trgm` 활성화 확인
4. **Project Settings > API**에서 다음 정보 복사:
   - `Project URL`
   - `anon public` key
   - `service_role` key (⚠️ 서버 전용, 노출 금지)

#### 나라장터 API 키 발급

1. [공공데이터포털](https://www.data.go.kr/) 회원가입
2. **나라장터 입찰공고 조회** API 신청 (`1230000/BidPublicInfoService`)
3. 승인 후 **인증키(Decoding)** 복사

#### Resend 계정 생성 (선택)

1. [resend.com](https://resend.com) 가입
2. **API Keys**에서 새 키 생성
3. 무료 티어: 월 3,000통 (테스트 충분)

### 2️⃣ 로컬 설치 및 실행

```bash
# 1. 저장소 클론
git clone <repository-url>
cd bid-platform

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 아래 키 입력

# 4. 개발 서버 실행
npm run dev
```

**브라우저에서 확인**: [http://localhost:3000](http://localhost:3000)

### 3️⃣ 환경 변수 설정 (.env.local)

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...  # 서버 전용

# 나라장터 API (필수)
NARAMARKET_API_KEY=your-api-key-here

# Resend 이메일 (선택, 없으면 Mock 동작)
RESEND_API_KEY=re_...

# Cron 작업 보안 (임의의 긴 문자열)
CRON_SECRET=your-random-secret-string-min-32-chars

# 카카오 알림 (현재 Mock, 실구현 시 필요)
# KAKAO_REST_API_KEY=...
```

### 4️⃣ 초기 데이터 시드 (선택)

```bash
# 데모 공고 데이터 생성
node scripts/seed-demo.mjs
```

### 5️⃣ Cron 작업 로컬 테스트

```bash
# 공고 수집 실행
curl -X POST http://localhost:3000/api/jobs/poll-tenders \
  -H "Authorization: Bearer your-cron-secret"

# 알림 발송 실행
curl -X POST http://localhost:3000/api/jobs/process-alerts \
  -H "Authorization: Bearer your-cron-secret"
```

**응답 예시**:
```json
{
  "success": true,
  "inserted": 15,
  "updated": 3,
  "errors": 0,
  "duration": "2.3s"
}
```

---

## 🚢 Vercel 배포

### 1️⃣ GitHub 연동

1. 코드를 GitHub 저장소에 푸시
2. [Vercel Dashboard](https://vercel.com/dashboard)에서 **Add New Project**
3. GitHub 저장소 선택 후 Import

### 2️⃣ 환경 변수 설정

**Settings > Environment Variables**에서 모든 `.env.local` 키 추가:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NARAMARKET_API_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`

**중요**: Production, Preview, Development 모두 체크!

### 3️⃣ Cron 자동 등록

`vercel.json` 설정이 자동으로 적용됩니다:
- **공고 수집**: 평일 오전 9시 (UTC 00:00)
- **알림 발송**: 평일 오전 9시 30분 (UTC 00:30)

**Vercel Dashboard > Cron Jobs**에서 실행 이력 확인 가능

### 4️⃣ 배포 확인

```bash
# 배포 후 Health Check
curl https://your-app.vercel.app/api/health

# 응답 예시
{
  "status": "ok",
  "timestamp": "2026-03-14T12:00:00.000Z",
  "database": "connected"
}
```

---

## 📡 API 엔드포인트 요약

### 인증 (Authentication)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/api/auth/signup` | 회원가입 + 조직 생성 | ❌ |
| POST | `/api/auth/signin` | 이메일 로그인 | ❌ |
| POST | `/api/auth/signout` | 로그아웃 | ✅ |

### 공고 (Tenders)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/tenders` | 공고 목록 + 검색/필터/페이지 | ❌ |
| GET | `/api/tenders/:id` | 공고 상세 + 낙찰 정보 | ❌ |

### 즐겨찾기 (Favorites)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/favorites` | 즐겨찾기 목록 | ✅ |
| POST | `/api/favorites/:tenderId` | 즐겨찾기 추가 (Upsert) | ✅ |
| DELETE | `/api/favorites/:tenderId` | 즐겨찾기 제거 | ✅ |

### 알림 (Alerts)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/alerts/rules` | 알림 규칙 목록 | ✅ |
| POST | `/api/alerts/rules` | 알림 규칙 생성 | ✅ |
| PATCH | `/api/alerts/rules/:id` | 알림 규칙 수정 | ✅ |
| DELETE | `/api/alerts/rules/:id` | 알림 규칙 삭제 | ✅ |
| GET | `/api/alerts/logs` | 발송 이력 조회 | ✅ |

### 리포트 (Reports)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/reports/summary` | 통계 요약 (기간별) | ❌ |

### Cron 작업 (Internal)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/api/jobs/poll-tenders` | 공고 수집 배치 | 🔑 Cron Secret |
| POST | `/api/jobs/process-alerts` | 알림 발송 배치 | 🔑 Cron Secret |

> 상세 스키마는 [API_SPECIFICATION.md](docs/API_SPECIFICATION.md) 참조

---

## 🧪 테스트 현황

| 영역 | 상태 | 검증일 |
|------|------|--------|
| 회원가입/로그인 | ✅ 정상 | 2026-03-14 |
| 공고 검색/필터링 | ✅ 정상 | 2026-03-14 |
| 즐겨찾기 CRUD | ✅ 정상 | 2026-03-14 |
| 알림 규칙 관리 | ✅ 정상 | 2026-03-14 |
| 알림 발송 (이메일) | ✅ 정상 | 2026-03-14 |
| 알림 중복 방지 | ✅ 정상 | 2026-03-14 |
| 리포트 생성 | ✅ 정상 | 2026-03-14 |
| Cron 작업 | ✅ 정상 | 2026-03-14 |

**에러 0건**, 모든 핵심 기능 동작 확인 완료 ✓

상세 테스트 보고서: [TEST_REPORT.md](docs/TEST_REPORT.md)

---

## 🎨 UI/UX

- **디자인 시스템**: shadcn/ui 기반 프로페셔널 컴포넌트
- **반응형**: 모바일/태블릿/데스크톱 완벽 지원
- **접근성**: ARIA 라벨 및 키보드 네비게이션 지원
- **다크모드**: 준비 완료 (활성화 시 자동 적용)

UI 상세 분석: [UI_UX_IMPROVEMENTS.md](docs/UI_UX_IMPROVEMENTS.md)

---

## 🔒 보안 고려사항

- **RLS (Row Level Security)**: 모든 사용자 데이터 테이블에 적용
- **조직별 격리**: `user_org_ids()` 함수로 멀티테넌시 지원
- **Cron 인증**: Bearer Token으로 무단 실행 차단
- **Input Validation**: Zod 스키마로 모든 사용자 입력 검증
- **Error Masking**: 프로덕션에서 내부 에러 숨김

---

## 🛣️ 확장 로드맵

| 단계 | 주요 기능 | 우선순위 |
|------|----------|----------|
| **Phase 1** | 배치 큐 고도화 (inngest/BullMQ) | 🟡 중 |
| **Phase 2** | 검색 고도화 (유사도 점수, 자동완성) | 🟢 높음 |
| **Phase 3** | 대시보드 차트 (Recharts/Chart.js) | 🟢 높음 |
| **Phase 4** | AI 예측 분석 (낙찰률 예측) | 🟡 중 |
| **Phase 5** | 카카오 알림톡 실연동 | 🟢 높음 |
| **Phase 6** | Stripe 결제 연동 | 🔴 낮음 |

상세 계획: [ENHANCEMENT_ROADMAP.md](docs/ENHANCEMENT_ROADMAP.md)

---

## 📋 요구사항

- **Node.js**: 18.17 이상
- **npm**: 9.0 이상
- **Supabase 프로젝트**: 무료 티어 가능
- **Vercel 계정**: Hobby 플랜 가능
- **나라장터 API 키**: 필수
- **Resend 계정**: 선택 (이메일 알림 사용 시)

---

## 🤝 기여 가이드

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

개발 컨벤션: [DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)

---

## 📄 표준 에러 형식

모든 API 에러는 통일된 형식으로 반환됩니다:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "잘못된 쿼리 파라미터",
  "details": {
    "field": "page",
    "expected": "number",
    "received": "string"
  }
}
```

**에러 코드 목록**:
- `VALIDATION_ERROR`: 입력 검증 실패
- `AUTHENTICATION_ERROR`: 인증 실패
- `AUTHORIZATION_ERROR`: 권한 부족
- `NOT_FOUND`: 리소스 없음
- `CONFLICT`: 데이터 충돌 (중복 등)
- `INTERNAL_ERROR`: 서버 오류

---

## 📞 문의 및 지원

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: your-email@example.com
- **Documentation**: [docs/](docs/) 디렉토리 참조

---

## 📜 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

<div align="center">

**⭐ 프로젝트가 도움이 되었다면 Star를 눌러주세요!**

Made with ❤️ by [Your Name/Team]

</div>
