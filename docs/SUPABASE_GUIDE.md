# Supabase 완전 입문 가이드

> 이 문서는 Supabase를 처음 접하는 개발자를 위한 상세 가이드입니다.
> 우리 프로젝트(입찰 분석 플랫폼)의 실제 코드를 예시로 활용합니다.

---

## 목차

1. [Supabase란?](#1-supabase란)
2. [왜 Supabase를 선택했나?](#2-왜-supabase를-선택했나)
3. [핵심 개념 한눈에 보기](#3-핵심-개념-한눈에-보기)
4. [프로젝트 생성 (스크린샷 가이드)](#4-프로젝트-생성-스크린샷-가이드)
5. [API 키 이해하기](#5-api-키-이해하기)
6. [데이터베이스 기초](#6-데이터베이스-기초)
7. [인증(Auth) 완전 정복](#7-인증auth-완전-정복)
8. [Next.js에서 Supabase 연결하기](#8-nextjs에서-supabase-연결하기)
9. [CRUD 쿼리 완전 가이드](#9-crud-쿼리-완전-가이드)
10. [Row Level Security (RLS)](#10-row-level-security-rls)
11. [대시보드 활용법](#11-대시보드-활용법)
12. [자주 하는 실수 & 해결법](#12-자주-하는-실수--해결법)
13. [우리 프로젝트에서의 활용 정리](#13-우리-프로젝트에서의-활용-정리)

---

## 1. Supabase란?

### 한 줄 요약
> **Supabase = 오픈소스 Firebase 대안** (Postgres 기반)

### 쉽게 말하면

평소 백엔드를 만들려면 이런 것들이 필요합니다:
- 데이터베이스 설치 & 관리
- 회원가입/로그인 구현
- API 서버 구축
- 파일 저장소 세팅

**Supabase는 이 모든 것을 클라우드에서 한번에 제공합니다.** 코드 몇 줄이면 바로 사용 가능합니다.

### Supabase가 제공하는 것

```
┌─────────────────────────────────────────────────────┐
│                    Supabase                         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Database │  │   Auth   │  │ Storage  │          │
│  │(Postgres)│  │(회원관리)│  │(파일저장)│          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │Realtime  │  │  Edge    │  │PostgREST │          │
│  │(실시간)  │  │Functions │  │(자동 API)│          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

| 기능 | 설명 | 우리 프로젝트 사용 여부 |
|---|---|---|
| **Database** | PostgreSQL 데이터베이스 | ✅ 사용 (8개 테이블) |
| **Auth** | 회원가입/로그인/세션 관리 | ✅ 사용 (이메일+비밀번호) |
| **Storage** | 파일/이미지 저장 | ❌ 미사용 (MVP) |
| **Realtime** | 실시간 데이터 동기화 | ❌ 미사용 (MVP) |
| **Edge Functions** | 서버리스 함수 (Deno) | ❌ 미사용 (Next.js API 사용) |
| **PostgREST** | DB를 자동으로 REST API로 제공 | ✅ 사용 (모든 쿼리) |

### Firebase와 비교

| 항목 | Firebase | Supabase |
|---|---|---|
| DB | NoSQL (Firestore) | **SQL (PostgreSQL)** |
| 오픈소스 | ❌ | ✅ |
| 자체 호스팅 | ❌ | ✅ 가능 |
| SQL 쿼리 | ❌ | ✅ |
| 무료 티어 | 제한적 | **넉넉함** (500MB DB) |

---

## 2. 왜 Supabase를 선택했나?

우리 프로젝트에서 Supabase를 선택한 이유:

### 2.1 PostgreSQL의 강력함
```sql
-- 입찰 공고 제목을 한국어로 부분 검색하고 싶다면?
-- pg_trgm 확장으로 인덱스를 만들면 됩니다
CREATE INDEX idx_tenders_title_trgm
  ON tenders USING gin (title gin_trgm_ops);

-- 이제 이런 검색이 빠릅니다
SELECT * FROM tenders WHERE title ILIKE '%소프트웨어%';
```

Firebase의 NoSQL로는 이런 유연한 검색이 매우 어렵습니다.

### 2.2 Row Level Security (RLS)
```sql
-- "내 조직의 즐겨찾기만 볼 수 있다" 를 DB 레벨에서 강제!
CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT USING (org_id IN (SELECT user_org_ids()));
```

보안 규칙을 서버 코드가 아닌 **데이터베이스 자체에서** 처리합니다.

### 2.3 자동 REST API
테이블을 만들기만 하면, Supabase가 자동으로 REST API를 생성합니다:
```
tenders 테이블 생성
  → 자동으로 GET/POST/PATCH/DELETE API 생성
  → JavaScript 클라이언트로 바로 호출 가능
```

### 2.4 무료 티어가 넉넉함
- DB 500MB, 인증 사용자 50,000명, 스토리지 1GB
- 소규모 MVP에 충분

---

## 3. 핵심 개념 한눈에 보기

### 3.1 작동 원리

```
[당신의 Next.js 앱]
       │
       │  supabase.from("tenders").select("*")
       │
       ▼
[Supabase 서버]
       │
       ├─→ PostgREST (SQL → REST API 자동 변환)
       │        │
       │        ▼
       │   [PostgreSQL DB]
       │     - RLS 정책 확인
       │     - 쿼리 실행
       │     - 결과 반환
       │
       ├─→ GoTrue (Auth 서비스)
       │     - JWT 토큰 관리
       │     - 세션 쿠키 관리
       │
       └─→ 결과를 JSON으로 반환
```

### 3.2 키워드 사전

| 용어 | 설명 |
|---|---|
| **프로젝트(Project)** | Supabase에서 만드는 하나의 단위. 1 프로젝트 = 1 DB + 1 Auth |
| **anon key** | 브라우저에서 사용하는 공개 키. RLS가 보안 담당 |
| **service_role key** | 서버에서만 사용하는 관리자 키. RLS를 무시 (절대 공개 금지!) |
| **PostgREST** | PostgreSQL을 자동으로 REST API로 변환하는 도구 |
| **RLS** | Row Level Security. 행 단위 접근 제어 |
| **JWT** | JSON Web Token. 사용자 인증 정보 담고 있는 토큰 |
| **auth.users** | Supabase가 자동 관리하는 사용자 테이블 |
| **auth.uid()** | 현재 로그인된 사용자의 ID를 반환하는 SQL 함수 |

---

## 4. 프로젝트 생성 (스크린샷 가이드)

### Step 1: 계정 생성
1. https://supabase.com 접속
2. **Start your project** 클릭
3. GitHub 계정으로 로그인 (가장 간편)

### Step 2: 새 프로젝트 만들기
1. Dashboard → **New Project** 버튼 클릭
2. 다음을 입력:

```
Organization:    [기존 org 선택 또는 새로 생성]
Project name:    bid-platform
Database Password: [강력한 비밀번호] ← ⚠️ 이거 꼭 메모하세요!
Region:          Northeast Asia (Seoul)  ← 한국 서비스라면 서울 선택
Pricing Plan:    Free tier
```

3. **Create new project** 클릭
4. 1~2분 기다리면 프로젝트 생성 완료!

### Step 3: API 키 확인
1. 좌측 메뉴 **Project Settings** (⚙️ 아이콘)
2. **API** 탭 클릭
3. 세 가지 값을 복사해두세요:

```
Project URL:     https://xxxxx.supabase.co
anon (public):   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

이 값들을 `.env.local`에 넣으면 됩니다:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   (anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...        (service_role key)
```

---

## 5. API 키 이해하기

### 5.1 왜 키가 두 개인가?

Supabase에는 역할이 다른 **두 개의 키**가 있습니다:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  anon key (공개 키)                                      │
│  ─────────────────                                      │
│  • 브라우저에 노출해도 OK                                 │
│  • RLS 정책이 적용됨 (보안은 RLS가 담당)                  │
│  • 일반 사용자 권한으로 동작                              │
│  • NEXT_PUBLIC_ 접두사 → 클라이언트에 노출                │
│                                                         │
│  service_role key (비밀 키) ⚠️                           │
│  ────────────────────────────                           │
│  • 절대 브라우저에 노출하면 안 됨!                        │
│  • RLS를 완전히 무시 (모든 데이터 접근 가능)              │
│  • 관리자 권한 (사용자 생성/삭제 등)                      │
│  • 서버 사이드에서만 사용                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 우리 프로젝트에서의 사용 구분

```typescript
// ✅ 브라우저 & 일반 API → anon key (RLS 적용)
// src/lib/supabase/client.ts & server.ts
createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // 공개 OK
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!   // 공개 OK (RLS가 보안)
);

// ✅ Cron Job (서버 전용) → service_role key (RLS 무시)
// src/lib/supabase/service.ts
createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!       // ⚠️ 서버에서만!
);
```

### 5.3 "anon key가 공개되면 위험하지 않나요?"

**아닙니다!** 이것이 Supabase의 핵심 설계입니다:

```
사용자 브라우저
  │
  │ anon key + JWT쿠키 함께 전송
  │
  ▼
Supabase 서버
  │
  ├─ 1) JWT에서 user_id 추출 (예: auth.uid() = "abc-123")
  │
  ├─ 2) RLS 정책 확인
  │     "이 사용자가 이 데이터를 볼 권한이 있는가?"
  │
  │     예: favorites 테이블 조회 시
  │     → org_id가 이 사용자의 조직에 속하는지 확인
  │     → 아니면 빈 결과 반환 (에러 아님!)
  │
  └─ 3) 허용된 데이터만 반환
```

따라서 anon key가 노출되어도, **RLS가 없는 테이블이 없는 한** 안전합니다.
우리는 모든 8개 테이블에 RLS를 활성화했습니다.

---

## 6. 데이터베이스 기초

### 6.1 테이블 만들기 — 두 가지 방법

#### 방법 1: Dashboard GUI (초보자 추천)
1. 좌측 메뉴 **Table Editor** 클릭
2. **New Table** 버튼
3. 테이블 이름, 컬럼을 GUI로 추가
4. **Save** 클릭

#### 방법 2: SQL Editor (우리 프로젝트 방식)
1. 좌측 메뉴 **SQL Editor** 클릭
2. **New Query** 클릭
3. SQL 입력:

```sql
CREATE TABLE IF NOT EXISTS public.tenders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tender_id    text UNIQUE NOT NULL,
  title               text NOT NULL,
  budget_amount       numeric,
  status              text NOT NULL DEFAULT 'OPEN',
  created_at          timestamptz NOT NULL DEFAULT now()
);
```

4. **Run** 클릭 (또는 Ctrl+Enter)

> 💡 **우리 프로젝트**: `supabase/schema.sql` 파일에 전체 스키마가 있습니다.
> 이 파일 전체를 SQL Editor에 붙여넣고 Run하면 됩니다.

### 6.2 데이터 타입 가이드

SQL이 처음이라면 이것만 기억하세요:

| 타입 | 설명 | 예시 |
|---|---|---|
| `uuid` | 고유 ID (36자리) | `550e8400-e29b-41d4-a716-446655440000` |
| `text` | 문자열 (길이 제한 없음) | `"서울시 정보시스템 구축"` |
| `numeric` | 숫자 (소수점 포함) | `500000000`, `97.5` |
| `boolean` | 참/거짓 | `true`, `false` |
| `jsonb` | JSON 데이터 | `{"key": "value"}` |
| `timestamptz` | 날짜+시간 (시간대 포함) | `2024-01-15 09:00:00+09` |

### 6.3 자주 쓰는 컬럼 패턴

```sql
-- 모든 테이블에 공통으로 들어가는 패턴
id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- 자동 UUID
created_at timestamptz NOT NULL DEFAULT now(),           -- 생성 시각 자동
updated_at timestamptz NOT NULL DEFAULT now()            -- 수정 시각 (트리거로 자동)
```

### 6.4 트리거가 뭔가요?

"어떤 일이 발생하면 자동으로 실행되는 코드"입니다.

우리 프로젝트 예시:
```sql
-- "tenders 테이블이 UPDATE 되면, updated_at을 현재 시각으로 바꿔라"
CREATE TRIGGER trg_tenders_updated
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

코드에서 `updated_at`을 직접 설정할 필요가 없습니다!

### 6.5 인덱스가 뭔가요?

**"책의 목차"** 같은 것입니다.

```
인덱스 없음: "소프트웨어" 검색 → 모든 행을 하나씩 확인 (느림)
인덱스 있음: "소프트웨어" 검색 → 목차에서 바로 찾기 (빠름)
```

```sql
-- status로 자주 검색하니까 인덱스 생성
CREATE INDEX idx_tenders_status ON tenders (status);

-- title로 부분 검색(LIKE)하니까 트리그램 인덱스 생성
CREATE INDEX idx_tenders_title_trgm
  ON tenders USING gin (title gin_trgm_ops);
```

> 💡 인덱스는 읽기를 빠르게 하지만, 쓰기(INSERT/UPDATE)를 약간 느리게 합니다.
> 자주 검색하는 컬럼에만 만드세요.

---

## 7. 인증(Auth) 완전 정복

### 7.1 Supabase Auth 작동 방식

```
[회원가입]
사용자 → signUp(email, password)
  → Supabase가 auth.users 테이블에 사용자 추가
  → JWT 토큰 생성 → 쿠키에 저장
  → 이후 모든 요청에 쿠키가 자동 전송

[로그인]
사용자 → signInWithPassword(email, password)
  → 비밀번호 확인
  → 새 JWT 토큰 생성 → 쿠키에 저장

[인증 확인]
매 요청마다 → getUser()
  → 쿠키의 JWT 파싱 → 사용자 정보 반환
  → 만료됐으면 자동 갱신 (refresh token)
```

### 7.2 auth.users 테이블

Supabase가 자동으로 관리하는 **내장 테이블**입니다. 직접 만들 필요 없습니다:

```
auth.users
├── id          (uuid)     ← 이것을 다른 테이블에서 FK로 참조
├── email       (text)
├── encrypted_password
├── created_at
├── last_sign_in_at
└── ... (기타 내부 필드)
```

우리 프로젝트에서 `org_members.user_id`는 `auth.users.id`를 참조합니다:
```sql
user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

### 7.3 회원가입 코드 (우리 프로젝트)

```typescript
// src/app/api/auth/signup/route.ts

// Service Role 클라이언트 = 관리자 권한 (서버에서만 사용!)
const supabase = createServiceClient();

// 1단계: Supabase Auth에 사용자 생성
const { data: authData, error: authError } =
  await supabase.auth.admin.createUser({
    email: "user@example.com",
    password: "secure-password",
    email_confirm: true,        // 이메일 확인 건너뛰기 (개발용)
  });
// → auth.users 테이블에 새 행이 생김
// → authData.user.id = "abc-123..." (새 사용자 UUID)

// 2단계: 조직 생성 (우리가 만든 테이블)
const { data: org } = await supabase
  .from("orgs")
  .insert({ name: "내 회사" })
  .select("id")
  .single();

// 3단계: 조직 멤버 연결
await supabase.from("org_members").insert({
  org_id: org.id,
  user_id: authData.user.id,
  role: "admin",
});
```

> **왜 Service Role을 사용?**
> `auth.admin.createUser()`는 관리자 전용 함수입니다.
> 일반 anon key로는 `auth.signUp()`을 사용하지만,
> 우리는 회원가입 시 org도 함께 만들어야 하므로 서버에서 Service Role 사용.

### 7.4 로그인 코드 (우리 프로젝트)

```typescript
// src/app/api/auth/signin/route.ts

// SSR 클라이언트 = 쿠키 기반 (RLS 적용)
const supabase = await createClient();

// 이메일+비밀번호로 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "secure-password",
});

// 성공 시:
// - JWT 토큰이 자동으로 쿠키에 저장됨
// - 이후 요청에서 supabase.auth.getUser()로 사용자 확인 가능
// - data.user = { id: "abc-123...", email: "user@example.com" }
```

### 7.5 로그인 상태 확인 (우리 프로젝트)

```typescript
// src/lib/auth-context.ts — 모든 보호된 API에서 사용

export async function getAuthContext() {
  const supabase = await createClient();

  // 쿠키에서 JWT → 사용자 정보 추출
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // 로그인 안 됨 → 401 응답
    return { error: unauthorizedResponse() };
  }

  // 사용자의 조직 정보 조회
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)   // 현재 사용자 = JWT의 사용자
    .limit(1)
    .single();

  return {
    user,                              // { id, email, ... }
    orgId: membership?.org_id,         // 소속 조직 ID
    role: membership?.role,            // "admin" or "member"
    supabase,                          // 인증된 클라이언트
  };
}
```

### 7.6 미들웨어에서 세션 관리

```typescript
// src/middleware.ts — 모든 페이지 요청 전에 실행됩니다

export async function middleware(request: NextRequest) {
  // 쿠키 기반 Supabase 클라이언트 생성
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        // 쿠키 갱신 (JWT refresh 등)
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // ⭐ 이 호출이 중요! 세션을 자동으로 갱신합니다
  const { data: { user } } = await supabase.auth.getUser();

  // 보호 경로 확인 (로그인 안 됐으면 /login으로)
  if (isProtectedPath && !user) {
    return NextResponse.redirect("/login");
  }
}
```

> **중요**: `getUser()`를 미들웨어에서 호출하면, 만료된 JWT가 자동으로 갱신됩니다.
> 이 없이는 1시간 후 세션이 끊길 수 있습니다.

### 7.7 Auth 흐름 전체 다이어그램

```
[사용자]                         [Next.js 서버]              [Supabase]
   │                                   │                        │
   │── POST /api/auth/signin ─────────▶│                        │
   │   { email, password }             │                        │
   │                                   │── signInWithPassword──▶│
   │                                   │                        │── 비밀번호 확인
   │                                   │◀── JWT + RefreshToken──│
   │                                   │                        │
   │◀── Set-Cookie: sb-token=JWT ──────│                        │
   │                                   │                        │
   │── GET /api/favorites ────────────▶│                        │
   │   Cookie: sb-token=JWT            │                        │
   │                                   │── JWT에서 user_id 추출  │
   │                                   │── getUser() ──────────▶│── JWT 검증
   │                                   │◀── user 정보 ──────────│
   │                                   │                        │
   │                                   │── from("favorites")───▶│
   │                                   │   .select("*")         │── RLS 정책 확인
   │                                   │                        │   (이 user의 org
   │                                   │                        │    데이터만 반환)
   │                                   │◀── 필터된 데이터 ───────│
   │◀── JSON 응답 ─────────────────────│                        │
```

---

## 8. Next.js에서 Supabase 연결하기

### 8.1 설치

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js`: Supabase 핵심 클라이언트
- `@supabase/ssr`: Next.js SSR용 세션/쿠키 관리

### 8.2 세 가지 클라이언트 이해하기

**이것이 가장 중요한 개념입니다!**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1. Browser Client (클라이언트 컴포넌트용)                        │
│     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                          │
│     파일: src/lib/supabase/client.ts                             │
│     사용: "use client" 컴포넌트에서                               │
│     키:   anon key (공개)                                        │
│     세션: 브라우저 쿠키 자동 관리                                 │
│     RLS:  ✅ 적용됨                                              │
│                                                                  │
│  2. Server Client (API Route, 서버 컴포넌트용)                   │
│     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                         │
│     파일: src/lib/supabase/server.ts                             │
│     사용: API Route Handlers, Server Components                  │
│     키:   anon key (공개)                                        │
│     세션: 요청 쿠키에서 JWT 읽기                                 │
│     RLS:  ✅ 적용됨 (현재 로그인 사용자 기준)                    │
│                                                                  │
│  3. Service Client (관리자 전용)                                  │
│     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                │
│     파일: src/lib/supabase/service.ts                            │
│     사용: Cron Jobs, 회원가입 등 관리 작업                        │
│     키:   service_role key (비밀!)                                │
│     세션: 없음 (persistSession: false)                           │
│     RLS:  ❌ 무시됨 (모든 데이터 접근 가능)                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.3 각 클라이언트 코드 상세

#### Browser Client
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

사용하는 곳: 클라이언트 컴포넌트에서 직접 Supabase를 호출할 때
```typescript
"use client";
import { createClient } from "@/lib/supabase/client";

function MyComponent() {
  const supabase = createClient();
  // supabase.from("tenders").select("*") ...
}
```

#### Server Client
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();  // Next.js 서버 쿠키

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();  // 요청 쿠키 읽기
        },
        setAll(cookiesToSet) {
          try {
            // 쿠키 설정 (JWT 갱신 시)
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서는 쿠키 설정 불가 (읽기 전용)
            // → 무시해도 안전 (다음 요청에서 미들웨어가 갱신)
          }
        },
      },
    }
  );
}
```

> **왜 쿠키를 직접 관리?**
> Next.js의 서버 환경에는 브라우저가 없어서, Supabase가 직접 쿠키를 관리할 수 없습니다.
> 그래서 `cookies()` API로 쿠키를 "전달"해주는 겁니다.

#### Service Client
```typescript
// src/lib/supabase/service.ts
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // 🔑 비밀 키!
    { auth: { persistSession: false } }      // 세션 저장 안 함
  );
}
```

사용하는 곳:
- 회원가입 API (`auth.admin.createUser`)
- Cron Job (공고 수집, 알림 처리)

### 8.4 어떤 클라이언트를 써야 하나? (결정 트리)

```
질문: 이 코드는 어디서 실행되나?

  브라우저 (클라이언트 컴포넌트)
    → createClient() from client.ts

  서버 (API Route / Server Component)
    │
    ├── 사용자 인증 정보가 필요한가?
    │     ├── YES → createClient() from server.ts
    │     └── NO (공개 데이터) → createClient() from server.ts도 OK
    │
    └── RLS를 무시해야 하나? (관리 작업)
          ├── YES → createServiceClient() from service.ts
          └── NO → createClient() from server.ts
```

---

## 9. CRUD 쿼리 완전 가이드

Supabase JavaScript 클라이언트로 DB를 조작하는 방법입니다.

### 9.1 SELECT (읽기)

```typescript
const supabase = await createClient();

// ✅ 전체 조회
const { data, error } = await supabase
  .from("tenders")
  .select("*");
// data = [{ id: "...", title: "...", ... }, ...]

// ✅ 특정 컬럼만 조회
const { data } = await supabase
  .from("tenders")
  .select("id, title, budget_amount");
// data = [{ id: "...", title: "...", budget_amount: 500000000 }]

// ✅ 조건 검색 (WHERE)
const { data } = await supabase
  .from("tenders")
  .select("*")
  .eq("status", "OPEN")              // status = 'OPEN'
  .gte("budget_amount", 100000000)    // budget_amount >= 1억
  .ilike("title", "%소프트웨어%");    // title LIKE '%소프트웨어%' (대소문자 무시)

// ✅ 정렬
const { data } = await supabase
  .from("tenders")
  .select("*")
  .order("published_at", { ascending: false });  // 최신순

// ✅ 페이지네이션
const { data } = await supabase
  .from("tenders")
  .select("*")
  .range(0, 19);  // 0~19번 행 (= 1페이지, 20개씩)

// ✅ 건수 조회
const { count } = await supabase
  .from("tenders")
  .select("*", { count: "exact", head: true });  // head: true → 데이터 안 가져옴
// count = 1523

// ✅ 단건 조회
const { data } = await supabase
  .from("tenders")
  .select("*")
  .eq("id", "some-uuid")
  .single();  // 1건만 반환 (배열이 아닌 객체)
// data = { id: "...", title: "...", ... }

// ✅ JOIN (관계 테이블 함께 조회)
const { data } = await supabase
  .from("tenders")
  .select("*, agency:agencies(*), award:awards(*)");
// data = [{
//   id: "...",
//   title: "...",
//   agency: { id: "...", name: "서울시", code: "1234" },  ← agencies 테이블
//   award: { winner_company_name: "A사", ... }            ← awards 테이블
// }]
```

#### JOIN 문법 설명

```typescript
.select("*, agency:agencies(*)")
//        │    │      │      │
//        │    │      │      └── agencies 테이블의 모든 컬럼
//        │    │      └── 참조하는 테이블명 (agencies)
//        │    └── 결과에서 사용할 별칭 (agency)
//        └── tenders 테이블의 모든 컬럼
```

Supabase는 FK(외래키)를 보고 자동으로 JOIN합니다.
`tenders.agency_id` → `agencies.id` 관계를 자동 인식!

### 9.2 INSERT (쓰기)

```typescript
// ✅ 단건 삽입
const { data, error } = await supabase
  .from("favorites")
  .insert({
    org_id: "org-uuid",
    user_id: "user-uuid",
    tender_id: "tender-uuid",
  })
  .select()       // 삽입된 데이터를 반환받으려면
  .single();      // 단건이므로 객체로

// ✅ 여러 건 삽입
const { data, error } = await supabase
  .from("tenders")
  .insert([
    { title: "공고1", status: "OPEN" },
    { title: "공고2", status: "OPEN" },
  ]);

// ✅ UPSERT (있으면 UPDATE, 없으면 INSERT)
const { data, error } = await supabase
  .from("agencies")
  .upsert(
    { code: "1234567", name: "서울특별시", raw_json: {...} },
    { onConflict: "code" }  // code 컬럼이 같으면 UPDATE
  )
  .select("id")
  .single();
```

> **UPSERT는 매우 중요합니다!**
> 우리 프로젝트의 공고 수집 Job에서, 같은 공고를 중복 수집해도 에러 없이 처리됩니다.

### 9.3 UPDATE (수정)

```typescript
// ✅ 조건에 맞는 행 수정
const { data, error } = await supabase
  .from("alert_rules")
  .update({
    is_enabled: false,
    channel: "KAKAO",
  })
  .eq("id", "rule-uuid")       // WHERE id = 'rule-uuid'
  .eq("user_id", "user-uuid")  // AND user_id = 'user-uuid'
  .select()
  .single();
```

> `updated_at`은 트리거가 자동으로 갱신하므로 직접 설정할 필요 없습니다!

### 9.4 DELETE (삭제)

```typescript
// ✅ 조건에 맞는 행 삭제
const { error } = await supabase
  .from("favorites")
  .delete()
  .eq("user_id", "user-uuid")
  .eq("tender_id", "tender-uuid");
```

### 9.5 필터 메서드 요약표

| 메서드 | SQL 대응 | 예시 |
|---|---|---|
| `.eq("col", val)` | `col = val` | `.eq("status", "OPEN")` |
| `.neq("col", val)` | `col != val` | `.neq("status", "CLOSED")` |
| `.gt("col", val)` | `col > val` | `.gt("budget_amount", 1000000)` |
| `.gte("col", val)` | `col >= val` | `.gte("budget_amount", 1000000)` |
| `.lt("col", val)` | `col < val` | `.lt("deadline_at", "2024-12-31")` |
| `.lte("col", val)` | `col <= val` | `.lte("deadline_at", "2024-12-31")` |
| `.like("col", pat)` | `col LIKE pat` | `.like("title", "%시스템%")` |
| `.ilike("col", pat)` | `col ILIKE pat` | `.ilike("title", "%system%")` (대소문자 무시) |
| `.in("col", [])` | `col IN (...)` | `.in("status", ["OPEN","RESULT"])` |
| `.is("col", null)` | `col IS NULL` | `.is("award_id", null)` |
| `.order("col")` | `ORDER BY col` | `.order("published_at", { ascending: false })` |
| `.range(from, to)` | `OFFSET ... LIMIT ...` | `.range(0, 19)` (0~19) |
| `.limit(n)` | `LIMIT n` | `.limit(10)` |
| `.single()` | 결과 1건만 | 객체로 반환 (배열 아님) |
| `.maybeSingle()` | 0~1건 | 없으면 null, 에러 아님 |

### 9.6 에러 처리 패턴

```typescript
const { data, error } = await supabase.from("tenders").select("*");

// ⚠️ Supabase는 HTTP 에러가 아닌 error 객체로 에러를 반환합니다
if (error) {
  console.error("Supabase 에러:", error.message);
  // error.code = "PGRST116" (예: 행 없음)
  // error.message = "The result contains 0 rows"
  return;
}

// data는 항상 배열 (select) 또는 객체 (single)
console.log(data);
```

---

## 10. Row Level Security (RLS)

### 10.1 RLS란?

> **"데이터베이스가 직접 보안을 담당하는 것"**

일반적인 웹앱:
```
브라우저 → 서버(코드에서 권한 확인) → DB
          ↑ 여기서 실수하면 보안 구멍!
```

Supabase + RLS:
```
브라우저 → Supabase → DB(RLS가 권한 확인)
                      ↑ DB 레벨에서 강제! 실수 불가능
```

### 10.2 RLS 활성화 (필수!)

```sql
-- ⚠️ 이걸 안 하면, anon key로 모든 데이터에 접근 가능!
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
-- ... (모든 테이블에)
```

> **RLS를 활성화하면, 정책(Policy)이 없는 한 아무 데이터도 읽을 수 없습니다!**
> 따라서 RLS를 켠 후에는 반드시 Policy를 만들어야 합니다.

### 10.3 정책(Policy) 만들기

#### 예시 1: 전체 공개 (누구나 읽기)

```sql
-- "tenders 테이블은 누구나 SELECT 가능"
CREATE POLICY "tenders_select_all" ON public.tenders
  FOR SELECT              -- SELECT(읽기)에만 적용
  USING (true);           -- 조건: 항상 참 → 모두 허용
```

우리 프로젝트에서 공고(tenders), 기관(agencies), 낙찰(awards)은 공개 데이터이므로 전체 공개.

#### 예시 2: 본인 데이터만 읽기

```sql
-- "favorites 테이블은 내 조직의 데이터만 SELECT 가능"
CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT
  USING (
    org_id IN (SELECT public.user_org_ids())
    --         ↑ 현재 로그인 사용자의 조직 ID 목록
  );
```

동작 방식:
```
로그인 사용자 (JWT에 user_id = "abc")
  → user_org_ids() 호출 → org_members에서 조회 → ["org-111"]
  → favorites 조회 시 WHERE org_id IN ("org-111") 자동 추가
  → 다른 조직의 즐겨찾기는 안 보임!
```

#### 예시 3: 본인만 삽입

```sql
-- "favorites에 INSERT할 때, 본인 조직 + 본인 user_id만 가능"
CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT
  WITH CHECK (
    org_id IN (SELECT public.user_org_ids())
    AND user_id = auth.uid()  -- 현재 로그인 사용자만
  );
```

#### 예시 4: 본인만 삭제

```sql
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE
  USING (user_id = auth.uid());
```

### 10.4 user_org_ids() 헬퍼 함수

우리 프로젝트의 핵심 RLS 함수:

```sql
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF uuid               -- uuid 목록 반환
LANGUAGE sql
STABLE                           -- 같은 트랜잭션에서 결과 불변
SECURITY DEFINER                 -- 함수 정의자 권한으로 실행
AS $$
  SELECT org_id
  FROM public.org_members
  WHERE user_id = auth.uid();    -- 현재 JWT의 사용자 ID
$$;
```

- `auth.uid()`: Supabase가 제공하는 함수, JWT에서 현재 사용자 ID 추출
- `SECURITY DEFINER`: RLS가 걸린 `org_members` 테이블도 이 함수 안에서는 접근 가능
- 결과: 현재 사용자가 속한 모든 조직의 ID 목록

### 10.5 RLS 정책 목록 (우리 프로젝트)

| 테이블 | 정책 | 동작 | 조건 | 의미 |
|---|---|---|---|---|
| tenders | select_all | SELECT | `true` | 누구나 공고 조회 가능 |
| agencies | select_all | SELECT | `true` | 누구나 기관 조회 가능 |
| awards | select_all | SELECT | `true` | 누구나 낙찰 결과 조회 가능 |
| favorites | select_own | SELECT | org 소속 | 내 조직의 즐겨찾기만 |
| favorites | insert_own | INSERT | org + user | 내 조직에만 추가 가능 |
| favorites | delete_own | DELETE | user | 내 것만 삭제 가능 |
| alert_rules | select_own | SELECT | org 소속 | 내 조직의 규칙만 |
| alert_rules | insert_own | INSERT | org + user | 내 조직에만 추가 |
| alert_rules | update_own | UPDATE | user | 내 것만 수정 |
| alert_logs | select_own | SELECT | 연관 rule | 내 규칙의 로그만 |

### 10.6 Service Role과 RLS

```
anon key로 호출 → RLS 적용됨 (일반 사용자)
service_role key로 호출 → RLS 무시됨! (관리자)
```

그래서 Cron Job(공고 수집)에서는 Service Role을 사용합니다:
- 모든 사용자의 `alert_rules`를 조회해야 하므로
- 누구의 데이터든 `tenders`에 INSERT해야 하므로

---

## 11. 대시보드 활용법

### 11.1 Table Editor — 데이터 직접 보기/편집

1. 좌측 메뉴 **Table Editor** 클릭
2. 테이블 선택 (예: `tenders`)
3. 스프레드시트처럼 데이터를 볼 수 있음
4. 행 클릭 → 직접 수정 가능
5. **+ Insert row** → 새 행 추가

> 💡 개발 중 테스트 데이터를 빠르게 넣을 때 유용합니다!

### 11.2 SQL Editor — SQL 직접 실행

1. 좌측 메뉴 **SQL Editor** 클릭
2. 쿼리 작성 & 실행

자주 쓰는 쿼리:
```sql
-- 테이블 확인
SELECT * FROM tenders LIMIT 10;

-- 데이터 건수
SELECT COUNT(*) FROM tenders;

-- 특정 조건 조회
SELECT title, budget_amount, status
FROM tenders
WHERE status = 'OPEN'
ORDER BY budget_amount DESC
LIMIT 10;

-- 조인 쿼리
SELECT t.title, a.name as agency_name
FROM tenders t
LEFT JOIN agencies a ON t.agency_id = a.id
LIMIT 10;
```

### 11.3 Authentication — 사용자 관리

1. 좌측 메뉴 **Authentication**
2. **Users** 탭 → 가입된 사용자 목록
3. 사용자 클릭 → 상세 정보, 이메일 변경, 삭제 등
4. **+ Add user** → 수동으로 사용자 추가

> 💡 테스트 계정 만들 때 유용합니다!

### 11.4 Database — 스키마 관리

1. 좌측 메뉴 **Database**
2. **Tables** → 테이블 목록, 컬럼 확인
3. **Extensions** → pg_trgm, pgcrypto 활성화 확인
4. **Roles** → 데이터베이스 역할
5. **Triggers** → 트리거 확인
6. **Functions** → 함수 확인

### 11.5 Logs — 로그 확인

1. 좌측 메뉴 **Logs**
2. **Postgres** → DB 쿼리 로그
3. **Auth** → 로그인/세션 로그
4. **PostgREST** → API 호출 로그 (에러 디버깅에 유용!)

### 11.6 API Docs — 자동 생성 문서

1. 좌측 메뉴 **API Docs**
2. 각 테이블의 **자동 생성된 API 문서**를 볼 수 있음
3. JavaScript/cURL 예제 코드 포함

---

## 12. 자주 하는 실수 & 해결법

### 실수 1: RLS를 활성화했는데 데이터가 안 보여요!

**원인**: RLS를 켰지만 SELECT Policy를 안 만들었거나, 조건이 맞지 않음

**확인 방법**:
```sql
-- 현재 RLS 정책 확인
SELECT tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

**해결**:
```sql
-- 읽기 전용으로 전체 공개하려면
CREATE POLICY "테이블_select_all" ON public.테이블명
  FOR SELECT USING (true);
```

### 실수 2: "new row violates row-level security policy" 에러

**원인**: INSERT/UPDATE Policy 위반

**예시 상황**:
```typescript
// org_id를 잘못 넣거나, user_id를 다른 사람 것으로 넣으면
await supabase.from("favorites").insert({
  org_id: "다른조직ID",        // ← 내 조직이 아님!
  user_id: "abc",
  tender_id: "xyz"
});
// → 에러: new row violates row-level security policy
```

**해결**: INSERT 시 올바른 `org_id`와 `user_id`를 사용하세요.
우리 프로젝트에서는 `getAuthContext()`가 정확한 값을 제공합니다.

### 실수 3: service_role key를 클라이언트에 노출

**절대 이러면 안 됩니다:**
```typescript
// ❌ 위험! NEXT_PUBLIC_ 접두사 없이 사용하세요
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...  // ← NEXT_PUBLIC_ 붙이면 안 됨!

// ✅ 올바른 방법
SUPABASE_SERVICE_ROLE_KEY=eyJ...  // ← NEXT_PUBLIC_ 없으므로 서버에서만 접근 가능
```

### 실수 4: 데이터가 빈 배열로 나와요 (에러는 없는데)

**원인 1**: RLS가 데이터를 필터링하고 있음
```typescript
const { data, error } = await supabase.from("favorites").select("*");
// error = null, data = []
// → RLS가 "이 사용자의 조직 데이터가 없다"고 빈 배열 반환
```

**원인 2**: 로그인 안 된 상태에서 RLS 보호 테이블 접근
```typescript
// 미들웨어에서 세션이 설정 안 되면 auth.uid() = null
// → user_org_ids()가 빈 결과 → 데이터 없음
```

**디버깅 방법**:
```sql
-- SQL Editor에서 직접 확인 (Service Role로 실행되므로 RLS 무시)
SELECT * FROM favorites;  -- 데이터가 있는지 확인

-- RLS 정책으로 필터링 되는지 테스트
SELECT * FROM favorites
WHERE org_id IN (
  SELECT org_id FROM org_members WHERE user_id = '사용자UUID'
);
```

### 실수 5: `.single()` 결과가 0건이면 에러

```typescript
// ❌ 결과가 없을 수 있는 곳에서 .single() 사용
const { data, error } = await supabase
  .from("favorites")
  .select("*")
  .eq("user_id", userId)
  .eq("tender_id", tenderId)
  .single();  // ← 0건이면 에러 발생!

// ✅ .maybeSingle() 사용 (0건이면 null, 에러 아님)
const { data, error } = await supabase
  .from("favorites")
  .select("*")
  .eq("user_id", userId)
  .eq("tender_id", tenderId)
  .maybeSingle();  // data = null (에러 아님)
```

### 실수 6: 쿠키 관련 "cookies was called outside a request scope"

**원인**: 서버 컴포넌트에서 `createClient()`를 잘못된 시점에 호출

**해결**: `createClient()`는 반드시 요청 처리 함수 안에서 호출:
```typescript
// ✅ 올바름
export async function GET(request: NextRequest) {
  const supabase = await createClient();  // ← 요청 안에서 호출
  // ...
}

// ❌ 잘못됨 (모듈 레벨에서 호출)
const supabase = await createClient();  // ← 에러!
export async function GET(request: NextRequest) { ... }
```

### 실수 7: 환경 변수가 undefined

```bash
# .env.local에 값이 비어있는지 확인!
NEXT_PUBLIC_SUPABASE_URL=            # ← 비어있으면 undefined
NEXT_PUBLIC_SUPABASE_URL=https://... # ← 값을 넣으세요

# 환경 변수 변경 후 서버 재시작 필요!
# Ctrl+C → npm run dev
```

---

## 13. 우리 프로젝트에서의 활용 정리

### 13.1 파일별 역할 요약

```
src/lib/supabase/
├── client.ts    → 브라우저용 (로그인 폼 등)
├── server.ts    → API Route용 (공고 조회, 즐겨찾기 등)
└── service.ts   → 관리자용 (회원가입, Cron Job)
```

### 13.2 API별 사용 클라이언트

| API 엔드포인트 | 클라이언트 | 이유 |
|---|---|---|
| POST /api/auth/signup | **Service** | admin.createUser 필요 |
| POST /api/auth/signin | Server | 사용자 인증 |
| GET /api/tenders | Server | 공개 데이터 (RLS: true) |
| GET /api/tenders/:id | Server | 공개 + 즐겨찾기 확인 |
| GET /api/favorites | Server | 인증 필요 (RLS 적용) |
| POST /api/favorites/:id | Server | 인증 필요 (RLS 적용) |
| GET /api/alerts/rules | Server | 인증 필요 (RLS 적용) |
| POST /api/jobs/poll-tenders | **Service** | RLS 우회 필요 |
| POST /api/jobs/process-alerts | **Service** | 전체 데이터 접근 필요 |

### 13.3 Supabase 기능 활용도

```
사용 중인 기능
━━━━━━━━━━━━
✅ PostgreSQL Database (8 테이블)
✅ Auth (이메일+비밀번호 인증)
✅ PostgREST (자동 REST API)
✅ Row Level Security (11 정책)
✅ pg_trgm 확장 (트리그램 검색)
✅ pgcrypto 확장 (UUID 생성)
✅ 트리거 (updated_at 자동 갱신)
✅ SQL 함수 (user_org_ids)

미사용 (향후 확장 가능)
━━━━━━━━━━━━━━━━━━━━
☐ Storage (파일 업로드 — 공고 첨부파일)
☐ Realtime (실시간 알림)
☐ Edge Functions (Deno 서버리스)
☐ Supabase CLI (로컬 개발)
☐ Database Webhooks
☐ Vault (시크릿 관리)
```

### 13.4 다음 학습 추천 경로

```
현재 수준: Supabase 기본 사용 ✅
   │
   ├─→ [중급] Supabase CLI & 로컬 개발
   │   supabase start → 로컬 DB에서 개발
   │   supabase migration new → 마이그레이션 관리
   │
   ├─→ [중급] Supabase RPC (Remote Procedure Call)
   │   복잡한 집계를 SQL 함수로 → 클라이언트에서 호출
   │   예: SELECT count(*) GROUP BY 를 RPC로
   │
   ├─→ [중급] Realtime 구독
   │   테이블 변경 시 자동 알림 (WebSocket)
   │   예: 새 공고 추가 시 즉시 화면 갱신
   │
   ├─→ [고급] Edge Functions
   │   Deno 기반 서버리스 함수
   │   예: AI 요약 생성, 외부 API 연동
   │
   └─→ [고급] Self-hosting
       Docker로 직접 Supabase 운영
       완전한 데이터 제어
```

---

## 부록: 유용한 SQL 모음

### 데이터 확인

```sql
-- 모든 테이블 목록
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- 테이블 컬럼 정보
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tenders'
ORDER BY ordinal_position;

-- 테이블 데이터 건수
SELECT
  (SELECT COUNT(*) FROM tenders) as tenders,
  (SELECT COUNT(*) FROM agencies) as agencies,
  (SELECT COUNT(*) FROM favorites) as favorites,
  (SELECT COUNT(*) FROM alert_rules) as alert_rules;
```

### RLS & 보안 확인

```sql
-- RLS 활성화 여부
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- RLS 정책 목록
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- 확장 목록
SELECT extname, extversion FROM pg_extension;
```

### 인덱스 확인

```sql
-- 모든 인덱스
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 테스트 데이터 삽입

```sql
-- 테스트용 기관 데이터
INSERT INTO agencies (code, name) VALUES
  ('TEST001', '테스트시청'),
  ('TEST002', '테스트도로공사');

-- 테스트용 공고 데이터
INSERT INTO tenders (source_tender_id, title, budget_amount, status, region_name, industry_name)
VALUES
  ('TEST-2024-001', '테스트 정보시스템 구축', 500000000, 'OPEN', '서울', '소프트웨어'),
  ('TEST-2024-002', '테스트 도로 유지보수', 1200000000, 'OPEN', '경기', '건설업'),
  ('TEST-2024-003', '테스트 마감 공고', 300000000, 'CLOSED', '부산', '시설관리');
```

---

> **더 알고 싶다면?**
> - 공식 문서: https://supabase.com/docs
> - 공식 튜토리얼: https://supabase.com/docs/guides/getting-started
> - Next.js + Supabase: https://supabase.com/docs/guides/auth/server-side/nextjs
> - YouTube: Supabase 공식 채널 (영문, 한글 자막 가능)
