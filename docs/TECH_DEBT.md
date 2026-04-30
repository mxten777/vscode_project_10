# 기술 부채 및 개선 로드맵

> 작성일: 2026-03-24 / 최종 업데이트: 2026-04-30  
> 현재 완성도: 약 88–92%  
> 스택: Next.js 16 · React 19 · TypeScript · Supabase · Vercel (Hobby) · Tailwind v4 · Vitest

## 현재 활성 우선순위

1. 알림 채널 확장 미구현
	현재는 이메일만 실동작하며 Kakao/Slack 같은 운영 채널은 provider 구조만 준비됨.
2. 리포트 내보내기 후속 흐름 부족
	CSV/PDF 저장은 가능하지만 서버 생성형 export, 공유, 템플릿 고도화는 남아 있음.
3. 테스트는 넓어졌지만 사용자 체감 API 범위는 더 넓힐 수 있음
	핵심 회귀는 확보됐지만 tenders 검색, reports summary 같은 사용 빈도 높은 API는 추가 여지 있음.
4. 운영 환경 실계정 검증 필요
	`ADMIN_CONSOLE_EMAILS`, Stripe, AI service URL/API key 처럼 런타임 의존성이 있는 항목은 실제 운영 값으로 최종 점검이 필요함.

---

## 완료된 정비 작업 (2026-04-02 ~ 2026-04-14)

| # | 내용 | 파일 |
|---|------|------|
| ✅ | `float-slow` / `float-slow-rev` 고아 CSS 키프레임 제거 | `globals.css` |
| ✅ | `/api/reports/summary` 인증 누락 수정 → `getAuthContext()` 추가 | `api/reports/summary/route.ts` |
| ✅ | 나라장터 리포트 기관명 누락 수정 → LEFT JOIN + demand_agency_name | `011_fix_report_summary_agency.sql` |
| ✅ | Rate Limiting — 인증 10회/5분, 일반 API 60회/1분 | `proxy.ts`, (구 `middleware.ts`) |
| ✅ | `/terms`, `/privacy` 정적 페이지 생성 | `app/terms/page.tsx`, `app/privacy/page.tsx` |
| ✅ | 모바일 반응형 — 640px 미만 카드뷰 자동 전환, 리사이즈 대응 | `app/(app)/page.tsx` |
| ✅ | 카드뷰 모바일 패딩·폰트·최소너비 개선 | `app/(app)/page.tsx` |
| ✅ | Dead code 삭제 — `src/lib/rate-limit.ts` (import 없음) | 파일 삭제 |
| ✅ | 불필요 env 파일 삭제 — `.env.production`, `.env.production.local`, `.env.local.example` | 파일 삭제 |
| ✅ | `stripe.ts` `@deprecated stripe` Proxy export 제거 | `src/lib/stripe.ts` |
| ✅ | `api-response.ts` 미사용 `.unauthorized/.forbidden/.notFound` shortcut 제거 | `src/lib/api-response.ts` |
| ✅ | `email-provider.ts` `.trim()` 버그 수정 | `src/lib/notifications/email-provider.ts` |
| ✅ | `.env.local` 리터럴 `\r\n` 제거 (ALERT_FROM_EMAIL, NARA_API_KEY) | `.env.local` |
| ✅ | `middleware.ts` → `proxy.ts` Next.js 16 마이그레이션 (함수명 `proxy()`) | `src/proxy.ts` |
| ✅ | Supabase `NEXT_PUBLIC_` 빌드 고정 문제 해소 → `SUPABASE_URL` 런타임 var 추가 | `src/lib/supabase/service.ts` |
| ✅ | `bid-intelligence-service.ts` 미사용 함수 4개 제거 — `getCompanyProfile`, `upsertCompanyProfile`, `auditDataCoverage`, `rebuildAllAnalysis` | `src/lib/bid-intelligence-service.ts` |
| ✅ | `parseNaraDate` 공용 헬퍼로 통합 — collect-bid-awards, backfill-awards 로컬 함수 제거 | `src/lib/helpers.ts` |
| ✅ | `upsertAwardToTenders()` dead code 제거 (bulkUpsertAwards로 대체됨) | `src/app/api/jobs/backfill-awards/route.ts` |
| ✅ | collect-bid-awards 중복 API fetch 제거 — 동일 URL 2회 호출을 1회로 통합 | `src/app/api/jobs/collect-bid-awards/route.ts` |

---

## 🔴 보안 — 즉시 조치 필요

### ~~1. API Rate Limiting 없음~~ ✅ 완료
- 인증 엔드포인트: 5분 10회, 일반 API: 1분 60회 (middleware + `lib/rate-limit.ts`)
- **업그레이드 시**: Upstash Redis + `@upstash/ratelimit` 으로 교체 (다중 인스턴스 대응)

### 2. plan limit 우회 가능 —즐겨찾기
- **status**: `POST /api/favorites/[tenderId]` 에서 플랜 한도 검사 적용 완료
- **남은 과제**: 없음
- **파일**: `src/app/api/favorites/route.ts`
- **비고**: `GET /api/favorites` 는 목록 조회이므로 한도 검사 대상 아님

### ~~3. org_id 격리 누락 — GET 쿼리~~ ✅ 완료
- `favorites`, `alert_rules`, `alert_logs`, `company_profiles` 및 관련 GET 보조 조회에 `org_id` 명시 필터 추가
- `src/__tests__/api/business-routes.test.ts` 에서 조직 스코프 쿼리 형태 회귀 검증 추가

### ~~4. 이용약관·개인정보처리방침 페이지 없음~~ ✅ 완료
- `/terms/page.tsx`, `/privacy/page.tsx` 정적 페이지 생성 완료

---

## 🟠 기능 — 다음 스프린트

### ~~5. 사용자 설정 페이지 없음~~ ✅ 완료
- `/settings` 루트 허브 추가 완료
- 프로필 편집, 회사 정보, 플랜/결제 화면으로 바로 이동하는 진입점 구성
- 남은 설정 과제는 알림 채널 통합 고도화 수준으로 축소

### 6. 어드민 대시보드 확장 필요
- **status**: `/settings/operations` 운영 콘솔 기능 완료
- **현재 가능**: 수집 상태 확인, 최근 `collection_logs` 조회, `cron-ingest`/`cron-maintenance` 및 개별 job 수동 실행, 조직 플랜/이름 변경, 전체 사용자 조회, 멤버 권한 변경/제거, 대기 초대 취소
- **접근 제어**: 조직 `admin` 이면서 `ADMIN_CONSOLE_EMAILS` allowlist 에 포함된 계정만 접근 가능
- **남은 과제**: 실제 운영 계정으로 최종 접근 검증

### 7. 저장된 검색 기능
- **status**: 홈 화면 저장 검색이 서버 저장(`saved_searches`) 기반으로 동작하며, 생성/수정/삭제/재적용 및 키워드·상태 기반 알림 전환 가능
- **남은 과제**: 없음

### 8. 리포트 내보내기
- **status**: 리포트 페이지에서 PDF / CSV 저장 가능
- **남은 과제**: 서버 생성형 내보내기, 포맷 템플릿 고도화, 이메일 공유 흐름 연결 여부 검토

### 9. Kakao 알림톡 / 슬랙 웹훅 없음
- **status**: Resend(이메일)만 구현됨
- **해결**: `lib/notifications/` 디렉토리에 kakao.ts, slack.ts 추가 (이미 notifications/ 폴더 존재)

---

## 🟡 테스트 — 지속적 개선

### 10. API 라우트 테스트 없음
- **status**: 주요 비즈니스/API 라우트 회귀 테스트 확보
- **현황**: `business-routes`, `process-alerts`, `cron-orchestrators`, `collect-bid-awards`, `backfill-awards` 등 API 테스트 추가 완료
- **남은 과제**: tenders 검색/리포트 요약 같은 사용자 체감 API를 더 넓히는 것은 선택 확장

### 11. E2E 테스트 초안만 존재
- **현황**: Playwright로 공개 경로 스모크 5개 + 회원가입 후 검색/상세/즐겨찾기/알림 규칙 생성 1개 + 기존 사용자 로그인 후 분석 화면 진입 1개 + 실패 흐름 2개(검색 결과 없음, 없는 공고 상세 접근) + 알림 규칙 플랜 제한 경고 1개 + 초대 수락 UI 실패 흐름 2개(만료 링크, 다른 이메일 초대) 추가 완료
- **남은 일**: 핵심 사용자 흐름 기준 E2E 초안 단계는 사실상 해소됨. 추가 확장은 선택 과제.

### 12. vitest 커버리지 측정 없음
- **해결**: `package.json`에 `"test:coverage": "vitest run --coverage"` 추가, `vitest.config.ts`에서 `tests/e2e/**` 제외해 Playwright와 실행 경로 분리

---

## 🟢 UX / 성능 — 여유 있을 때

### 13. 트렌딩 키워드가 하드코딩
- **파일**: `src/app/(app)/page.tsx` L65
- **status**: 실데이터 기반 trending keywords 반영 완료
- **남은 과제**: 없음

### 14. 입찰 상세 페이지 완성도 낮음
- **파일**: `src/app/(app)/tenders/[id]/page.tsx`
- **개선**: AI 분석 결과 표시, 유사 공고 사이드패널, 즐겨찾기 토글 개선

### ~~15. 모바일 반응형 테이블 미흡~~ ✅ 완료
- 640px 미만 자동 카드뷰 전환 (`matchMedia` + `useEffect`)
- 카드뷰 패딩 `px-4 sm:px-6`, 폰트 크기 모바일 최적화, 공고일 `hidden sm:block`

### 16. Suspense 경계 세분화 필요
- **문제**: page.tsx 전체를 `<Suspense>`로 감싸 → 부분 로딩 불가
- **해결**: 검색 결과 영역만 별도 Suspense 적용

### 17. 이미지 최적화
- **파일**: `public/images/baikal_logo_new_trans.png` (1200×600, 원본 크기)
- **해결**: `next/image` 이미 사용 중이나 `quality={90}` 명시적 설정 추가

---

## 기술 스택 업그레이드 고려

| 패키지 | 현재 | 비고 |
|--------|------|------|
| `next` | 16.1.6 | 안정 최신 |
| `react` | 19.x | 안정 최신 |
| `@supabase/ssr` | latest | 주기적 마이너 업데이트 확인 |
| `tailwindcss` | v4 | oklch 기반, 안정 |
| `zod` | v4 | `.error.issues[0]` 문법 주의 |
| `vitest` | 4.1.2 | 안정 최신 |

---

## 환경변수 체크리스트 (프로덕션 배포 전)

```
NEXT_PUBLIC_SUPABASE_URL         ✅ 설정됨 (viimjutggzxruabraozb)
SUPABASE_URL                     ✅ 설정됨 (서버 런타임 전용, service.ts 우선 참조)
NEXT_PUBLIC_SUPABASE_ANON_KEY    ✅ 설정됨
SUPABASE_SERVICE_ROLE_KEY        ✅ 설정됨
NARA_API_KEY                     ✅ 설정됨
RESEND_API_KEY                   ✅ 설정됨
CRON_SECRET                      ✅ 설정됨 (vercel.json cron 보호)
```

---

## 완료 기준 — v1.0 정식 출시

- [x] Rate limiting 적용 (proxy.ts + Upstash Redis)
- [x] `/terms`, `/privacy` 페이지 생성
- [x] plan limit 즐겨찾기 POST 보호
- [x] 사용자 설정 페이지 (`/settings/profile`, `/settings/billing`)
- [x] API 라우트 테스트 10개 이상 (현재 유닛 56개, API 라우트 테스트 11개)
- [x] E2E smoke test 통과 (현재 Playwright smoke 5개)
