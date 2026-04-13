# 세션 로그 — 2026-04-13

> 작성: GitHub Copilot  
> 세션 목표: Supabase DB 교체 후 시스템 복구 + 기술부채 전면 정리 + 프로덕션 배포 검증

---

## 1. 수행 작업 요약

### 1-1. Supabase DB 교체 (구 → 신)

| 항목 | 구 (폐기) | 신 (현재) |
|---|---|---|
| 프로젝트 ID | `pdxjwpskwiinustgzhmb` | `viimjutggzxruabraozb` |
| 키 접두사 | `sb_` 형식 | JWT `eyJhbGci...` 형식 |

**문제**: DB 교체 후 로그인 불가, poll-tenders "Invalid API key" 오류

**원인 분석**:
- `NEXT_PUBLIC_SUPABASE_URL`은 빌드 타임에 번들에 고정(bake)됨
- 런타임에 Vercel 환경변수를 갱신해도 구 URL이 클라이언트 번들에 남아있음
- 서비스 롤 키는 신 프로젝트 키이지만, URL은 구 프로젝트 → 불일치

**해결**:
1. `.env.local` 신규 JWT 키로 교체 → 로컬 로그인 복구
2. Vercel 환경변수 전체 업데이트 (NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
3. `SUPABASE_URL` 서버 전용 런타임 변수 추가
4. `src/lib/supabase/service.ts` 수정:
   ```typescript
   const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
   ```
5. 재배포 → poll-tenders 정상 (4,900건 수집 확인 @ 15:23 KST)

---

### 1-2. 기술부채 정리

| 항목 | 변경 내용 |
|---|---|
| 삭제 | `.env.production`, `.env.production.local`, `.env.local.example` |
| 삭제 | `src/lib/rate-limit.ts` (어디에도 import 없는 dead code) |
| 버그 수정 | `email-provider.ts` — `ALERT_FROM_EMAIL`, `RESEND_API_KEY` `.trim()` 추가 |
| 환경변수 수정 | `.env.local` 리터럴 `\r\n` 제거 (ALERT_FROM_EMAIL, NARA_API_KEY) |
| export 정리 | `stripe.ts` — `@deprecated stripe` Proxy export 제거 |
| export 정리 | `api-response.ts` — `.unauthorized/.forbidden/.notFound` shortcut 제거 |
| Next.js 마이그레이션 | `middleware.ts` → `proxy.ts`, `middleware()` → `proxy()` |

**교훈**:
- `.trim()`은 실제 whitespace만 제거. 리터럴 `\r\n` 4글자는 파일 직접 수정 필요
- Next.js 16은 `proxy.ts` 파일명 + `proxy()` 함수명 요구 (파일명만 바꾸면 안 됨)
- `NEXT_PUBLIC_*` 변수는 빌드 타임 고정 → DB 교체 시 서버 전용 런타임 변수 별도 필요

---

### 1-3. 테스트 & 배포

```
npx vitest run
→ Tests 56 passed (56) ✅

npx vercel --prod
→ Production: bid-platform-ptaj045ra-...vercel.app
→ Aliased to: bid-platform.vercel.app ✅
```

**프로덕션 엔드포인트 확인 결과**:

| 엔드포인트 | HTTP | 결과 |
|---|---|---|
| `/api/health` | GET 200 | `status: ok` |
| `/landing` | GET 200 | 정상 |
| `/login` | GET 200 | 정상 |
| `/api/jobs/poll-tenders` | POST 200 (15:59:38) | 정상 수집 |

---

## 2. 변경된 파일 목록

### 수정
- `src/lib/supabase/service.ts` — `SUPABASE_URL` 우선 참조
- `src/lib/notifications/email-provider.ts` — `.trim()` 추가
- `src/lib/stripe.ts` — deprecated export 제거
- `src/lib/api-response.ts` — 미사용 shortcut 제거
- `src/proxy.ts` (구 `src/middleware.ts`) — 파일명 + 함수명 변경
- `.env.local` — 신 Supabase 키, 리터럴 `\r\n` 제거

### 삭제
- `.env.production`
- `.env.production.local`
- `.env.local.example`
- `src/lib/rate-limit.ts`

---

## 3. 현재 시스템 상태

| 항목 | 상태 |
|---|---|
| 프로덕션 | ✅ 정상 (`bid-platform.vercel.app`) |
| Supabase | ✅ `viimjutggzxruabraozb` (신 프로젝트) |
| 크론 잡 | ✅ poll-tenders 평일 09:00 KST 정상 동작 |
| 테스트 | ✅ 56/56 통과 |
| dev server | ✅ `localhost:3000` (deprecation 경고 없음) |
