# 개발 가이드 & 코딩 컨벤션

> AI 입찰·조달 분석 플랫폼 — Development Guide & Conventions

---

## 1. 개발 환경 설정

### 1.1 필수 도구

| 도구 | 버전 | 용도 |
|---|---|---|
| Node.js | ≥ 18.17.0 | 런타임 |
| npm | ≥ 9.0.0 | 패키지 관리 |
| VS Code | 최신 | 에디터 (권장) |
| Git | 최신 | 버전 관리 |

### 1.2 VS Code 권장 확장

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 1.3 빠른 시작

```bash
# 1. 저장소 클론
git clone <repository-url>
cd bid-platform

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 편집 (Supabase 키 등 입력)

# 4. 개발 서버 시작
npm run dev

# 5. 브라우저에서 확인
# http://localhost:3000
```

---

## 2. 프로젝트 구조 규칙

### 2.1 디렉토리 구조 원칙

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # 메인 앱 라우트 그룹 (레이아웃 공유)
│   ├── login/              # 인증 페이지
│   └── api/                # API Route Handlers
│
├── components/
│   ├── ui/                 # shadcn/ui 기본 컴포넌트 (수정 자제)
│   └── *.tsx               # 비즈니스 컴포넌트 (Header 등)
│
├── hooks/                  # 커스텀 React 훅
├── lib/                    # 순수 유틸/서비스 (React 무관)
│   ├── supabase/           # Supabase 클라이언트
│   └── notifications/      # 알림 프로바이더
│
└── middleware.ts            # Next.js 미들웨어
```

### 2.2 네이밍 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 파일명 (컴포넌트) | kebab-case | `tender-card.tsx` |
| 파일명 (유틸) | kebab-case | `api-response.ts` |
| 디렉토리 | kebab-case | `alert-rules/` |
| React 컴포넌트 | PascalCase | `TenderCard` |
| 함수 | camelCase | `formatKRW()` |
| 상수 | SCREAMING_SNAKE_CASE | `NARA_API_BASE` |
| 타입/인터페이스 | PascalCase | `Tender`, `AlertRule` |
| DB 컬럼 | snake_case | `budget_amount` |
| API 경로 | kebab-case | `/api/alert-rules` |

---

## 3. 코딩 컨벤션

### 3.1 TypeScript

```typescript
// ✅ 명시적 타입 지정 (함수 반환값, props)
export function formatKRW(amount: number | null): string { ... }

// ✅ 인터페이스는 src/lib/types.ts에 중앙 관리
import type { Tender, AlertRule } from "@/lib/types";

// ✅ enum 대신 union 타입 사용
export type TenderStatus = "OPEN" | "CLOSED" | "RESULT";

// ✅ DB 관련은 snake_case, 프론트엔드는 camelCase
// (Supabase는 snake_case 그대로 사용 — 변환하지 않음)
```

### 3.2 React / Next.js

```typescript
// ✅ "use client" 는 필요한 컴포넌트에만 선언
"use client";

// ✅ 서버 컴포넌트에서 data fetching
// app/(app)/tenders/[id]/page.tsx — 서버 컴포넌트로 유지

// ✅ 클라이언트 컴포넌트에서 TanStack Query 사용
const { data, isLoading } = useTenders({ q: searchTerm });

// ✅ Suspense 바운더리 (useSearchParams 사용 시 필수)
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent />
    </Suspense>
  );
}
```

### 3.3 API Route Handler

```typescript
// ✅ 표준 구조
export async function GET(request: NextRequest) {
  try {
    // 1. 인증 (필요 시)
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    // 2. 입력 검증 (Zod)
    const parsed = schema.safeParse(params);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "메시지", 400, parsed.error.flatten());
    }

    // 3. Supabase 쿼리
    const { data, error } = await supabase.from("table").select("*");

    // 4. 에러 처리
    if (error) return internalErrorResponse(error.message);

    // 5. 성공 응답
    return successResponse(data);
  } catch (err) {
    console.error("에러 위치:", err);
    return internalErrorResponse();
  }
}
```

### 3.4 Supabase 클라이언트 사용 규칙

| 상황 | 클라이언트 | 파일 |
|---|---|---|
| 브라우저 (클라이언트 컴포넌트) | `createBrowserClient()` | `lib/supabase/client.ts` |
| API Route / 서버 컴포넌트 | `createClient()` | `lib/supabase/server.ts` |
| Cron Job (RLS 우회) | `createServiceClient()` | `lib/supabase/service.ts` |

```typescript
// ❌ 절대 하면 안 됨: 클라이언트에서 Service Role 사용
// ❌ import { createServiceClient } from "@/lib/supabase/service";

// ✅ API Route에서 인증된 쿼리
const supabase = await createClient(); // RLS 적용
const { data } = await supabase.from("favorites").select("*");
// → RLS가 자동으로 현재 사용자 org 데이터만 반환
```

### 3.5 에러 처리

```typescript
// ✅ 통일된 에러 응답 사용
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api-response";

// ✅ try-catch로 전체 함수 감싸기
try {
  // ... 로직
} catch (err) {
  console.error("컨텍스트 정보:", err); // 로거에 기록
  return internalErrorResponse();       // 사용자에게는 일반 메시지
}
```

---

## 4. Zod 검증 가이드

### 4.1 스키마 정의 위치

모든 Zod 스키마는 `src/lib/validations.ts`에 중앙 관리:

```typescript
// 쿼리 파라미터 검증
export const tenderSearchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED", "RESULT"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // ...
});

// Request Body 검증
export const alertRuleCreateSchema = z.object({
  type: z.enum(["KEYWORD", "FILTER"]),
  rule_json: z.object({ ... }),
  // ...
});
```

### 4.2 사용 패턴

```typescript
// Query Parameters (GET)
const params = Object.fromEntries(url.searchParams);
const parsed = tenderSearchSchema.safeParse(params);

// Request Body (POST/PATCH)
const body = await request.json();
const parsed = alertRuleCreateSchema.safeParse(body);

// 검증 실패 처리
if (!parsed.success) {
  return errorResponse("VALIDATION_ERROR", "잘못된 입력", 400, parsed.error.flatten());
}

// 검증 성공 후 타입 안전 접근
const { q, status, page } = parsed.data;
```

---

## 5. TanStack Query 사용 가이드

### 5.1 훅 위치

모든 API 훅은 `src/hooks/use-api.ts`에 정의:

### 5.2 Query 패턴

```typescript
// ✅ 목록 조회 (파라미터 기반 캐시키)
export function useTenders(params: Partial<TenderSearchParams>) {
  const qs = buildQueryString(params);
  return useQuery<PaginatedResponse<Tender>>({
    queryKey: ["tenders", qs],
    queryFn: () => fetcher(`/api/tenders?${qs}`),
  });
}

// ✅ 단건 조회 (enabled 옵션으로 조건부 실행)
export function useTender(id: string | undefined) {
  return useQuery<Tender>({
    queryKey: ["tenders", id],
    queryFn: () => fetcher(`/api/tenders/${id}`),
    enabled: !!id,
  });
}
```

### 5.3 Mutation 패턴

```typescript
// ✅ 생성/수정/삭제 + 캐시 무효화
export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      fetcher("/api/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules"] }),
  });
}
```

### 5.4 캐시 무효화 규칙

| 변경 대상 | 무효화 대상 queryKey |
|---|---|
| 즐겨찾기 추가/삭제 | `["favorites"]`, `["tenders"]` |
| 알림 규칙 CRUD | `["alert-rules"]` |
| 공고 데이터 변경 | `["tenders"]` |

---

## 6. 새 기능 추가 가이드

### 6.1 새 API 엔드포인트 추가

1. **타입 정의**: `src/lib/types.ts`에 인터페이스 추가
2. **검증 스키마**: `src/lib/validations.ts`에 Zod 스키마 추가
3. **API Route**: `src/app/api/<domain>/route.ts` 생성
4. **TanStack Query 훅**: `src/hooks/use-api.ts`에 훅 추가
5. **프론트엔드**: 페이지 또는 컴포넌트에서 훅 사용

예시 — "댓글(Comments)" 기능 추가:

```
1. src/lib/types.ts          → interface Comment { ... }
2. src/lib/validations.ts    → commentCreateSchema
3. supabase/schema.sql       → CREATE TABLE comments (...)
4. src/app/api/comments/     → route.ts (GET, POST)
5. src/hooks/use-api.ts      → useComments(), useCreateComment()
6. src/app/(app)/tenders/[id]/ → 댓글 섹션 추가
```

### 6.2 새 알림 채널 추가

1. `src/lib/notifications/`에 새 Provider 파일 생성:

```typescript
// slack-provider.ts
import { NotificationProvider, NotificationPayload } from "./types";

export class SlackProvider implements NotificationProvider {
  async send(payload: NotificationPayload) {
    // Slack Webhook API 호출
    return { success: true };
  }
}
```

2. `src/lib/notifications/index.ts`에 팩토리 등록:

```typescript
import { SlackProvider } from "./slack-provider";

export function getNotificationProvider(channel: string): NotificationProvider {
  switch (channel) {
    case "EMAIL": return new EmailProvider();
    case "KAKAO": return new KakaoProvider();
    case "SLACK": return new SlackProvider(); // 추가
    default: return new EmailProvider();
  }
}
```

3. DB 스키마에 채널 제약 추가:
```sql
ALTER TABLE alert_rules DROP CONSTRAINT alert_rules_channel_check;
ALTER TABLE alert_rules ADD CONSTRAINT alert_rules_channel_check
  CHECK (channel IN ('EMAIL', 'KAKAO', 'SLACK'));
```

### 6.3 새 페이지 추가

```
src/app/(app)/new-feature/
  └── page.tsx
```

- `(app)` 라우트 그룹 안에 생성 (공통 레이아웃 & 네비게이션 공유)
- 인증이 필요하면 `src/middleware.ts`의 `protectedPaths`에 추가
- 네비게이션에 링크 추가: `src/components/header.tsx`

---

## 7. 테스트 전략 (MVP 이후)

### 7.1 권장 테스트 계층

| 계층 | 도구 | 대상 |
|---|---|---|
| 단위 테스트 | Vitest | 유틸 함수, Zod 스키마, 매칭 로직 |
| 통합 테스트 | Vitest + Supabase Local | API Routes |
| E2E 테스트 | Playwright | 전체 사용자 흐름 |

### 7.2 향후 테스트 설정

```bash
# Vitest 설치
npm install -D vitest @vitejs/plugin-react

# Playwright 설치
npx playwright install
```

### 7.3 테스트 가능한 순수 함수 (현재)

- `formatKRW()` — 금액 포맷
- `tenderStatusLabel()` — 상태 라벨
- `verifyCronSecret()` — 시크릿 검증
- `retryWithBackoff()` — 재시도 로직
- `matchesRule()` — 알림 매칭 로직
- `determineTenderStatus()` — 공고 상태 판단
- `parseDate()` — 날짜 파싱

---

## 8. Git 워크플로우 (권장)

### 8.1 브랜치 전략

```
main          ← 프로덕션 배포 (Vercel 자동 배포)
  └── develop ← 개발 통합
       ├── feature/tender-search-improvement
       ├── feature/slack-notification
       └── fix/cron-timeout
```

### 8.2 커밋 메시지 컨벤션

```
<type>(<scope>): <subject>

feat(tenders): 공고 상세 페이지에 관련 공고 추천 추가
fix(alerts): 알림 중복 발송 방지 로직 수정
docs(api): API 명세서 업데이트
refactor(lib): NotificationProvider 팩토리 패턴 개선
chore(deps): TanStack Query v5.2.0 업데이트
```

| Type | 용도 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `refactor` | 리팩토링 |
| `chore` | 빌드/설정 변경 |
| `test` | 테스트 추가/수정 |

---

## 9. 주요 라이브러리 버전

| 라이브러리 | 버전 | 설명 |
|---|---|---|
| next | 16.1.6 | App Router |
| react | 19.x | React 19 |
| @supabase/supabase-js | ^2 | Supabase 클라이언트 |
| @supabase/ssr | ^0 | SSR 세션 관리 |
| @tanstack/react-query | ^5 | 서버 상태 관리 |
| zod | ^4 | 스키마 검증 |
| tailwindcss | ^4 | CSS 프레임워크 |
| resend | ^4 | 이메일 API |

---

## 10. 환경 변수 참고

| 변수명 | 필수 | 클라이언트 | 설명 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ | Service Role Key |
| `CRON_SECRET` | ✅ | ❌ | Cron 인증 시크릿 |
| `NARA_API_KEY` | ✅ | ❌ | 나라장터 API 키 |
| `NARA_API_BASE_URL` | ❌ | ❌ | 나라장터 API Base URL |
| `RESEND_API_KEY` | ✅ | ❌ | Resend API 키 |
| `ALERT_FROM_EMAIL` | ❌ | ❌ | 발신 이메일 |
| `NEXT_PUBLIC_APP_URL` | ❌ | ✅ | 앱 URL |

> `NEXT_PUBLIC_` 접두사가 있는 변수만 브라우저에 노출됩니다.
