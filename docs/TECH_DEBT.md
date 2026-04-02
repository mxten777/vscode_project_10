# 기술 부채 및 개선 로드맵

> 작성일: 2026-03-24  
> 현재 완성도: 약 75–80%  
> 스택: Next.js 16 · React 19 · TypeScript · Supabase · Vercel (Hobby) · Tailwind v4 · Vitest

---

## 완료된 정비 작업 (2026-04-02)

| # | 내용 | 파일 |
|---|------|------|
| ✅ | `float-slow` / `float-slow-rev` 고아 CSS 키프레임 제거 | `globals.css` |
| ✅ | `/api/reports/summary` 인증 누락 수정 → `getAuthContext()` 추가 | `api/reports/summary/route.ts` |
| ✅ | 나라장터 리포트 기관명 누락 수정 → LEFT JOIN + demand_agency_name | `011_fix_report_summary_agency.sql` |
| ✅ | Rate Limiting — 인증 10회/5분, 일반 API 60회/1분 | `middleware.ts`, `lib/rate-limit.ts` |
| ✅ | `/terms`, `/privacy` 정적 페이지 생성 | `app/terms/page.tsx`, `app/privacy/page.tsx` |
| ✅ | 모바일 반응형 — 640px 미만 카드뷰 자동 전환, 리사이즈 대응 | `app/(app)/page.tsx` |
| ✅ | 카드뷰 모바일 패딩·폰트·최소너비 개선, `bg-linear-to-r` inline style 교체 | `app/(app)/page.tsx` |

---

## 🔴 보안 — 즉시 조치 필요

### ~~1. API Rate Limiting 없음~~ ✅ 완료
- 인증 엔드포인트: 5분 10회, 일반 API: 1분 60회 (middleware + `lib/rate-limit.ts`)
- **업그레이드 시**: Upstash Redis + `@upstash/ratelimit` 으로 교체 (다중 인스턴스 대응)

### 2. plan limit 우회 가능 —즐겨찾기
- **문제**: `GET /api/favorites` 는 plan limit 검사를 안 함. `POST /api/favorites` 도 직접 호출 시 우회 가능
- **파일**: `src/app/api/favorites/route.ts`
- **해결**: POST에서 count 쿼리 후 plan limit 초과 시 403 반환

### 3. org_id 격리 누락 — GET 쿼리
- **문제**: 일부 GET 쿼리에서 `org_id` 필터 없이 전체 데이터를 읽을 수 있음 (RLS로 1차 보호되지만 방어 심화 필요)
- **해결**: 모든 SELECT에 `.eq("org_id", ctx.orgId)` 명시적으로 추가

### ~~4. 이용약관·개인정보처리방침 페이지 없음~~ ✅ 완료
- `/terms/page.tsx`, `/privacy/page.tsx` 정적 페이지 생성 완료

---

## 🟠 기능 — 다음 스프린트

### 5. 사용자 설정 페이지 없음
- **status**: /settings 경로 미구현
- **필요 기능**: 프로필 편집, 플랜 업그레이드 CTA, 알림 채널 설정, 비밀번호 변경
- **파일 생성**: `src/app/(app)/settings/page.tsx`

### 6. 어드민 대시보드 없음
- **status**: admin 경로 및 API 미구현
- **필요 기능**: 전체 사용자 조회, org 플랜 변경, 데이터 수집 수동 트리거, 에러 로그 뷰어
- **참고**: `/api/jobs/*` 는 cron secret으로 보호됨 — 관리자 UI 필요

### 7. 저장된 검색 기능 없음
- **status**: 트렌딩 키워드 칩은 하드코딩 (page.tsx L65: `// swap with real analytics later`)
- **해결**: 실제 alert rule keyword에서 인기 검색어 집계, 또는 saved search DB 테이블 추가

### 8. PDF / CSV 내보내기 없음
- **status**: 리포트 페이지에 export 버튼 없음
- **해결**: `/api/reports/export?format=csv|pdf` 엔드포인트 추가 + react-pdf or papaparse

### 9. Kakao 알림톡 / 슬랙 웹훅 없음
- **status**: Resend(이메일)만 구현됨
- **해결**: `lib/notifications/` 디렉토리에 kakao.ts, slack.ts 추가 (이미 notifications/ 폴더 존재)

---

## 🟡 테스트 — 지속적 개선

### 10. API 라우트 테스트 없음
- **현황**: 56개 유닛 테스트 (3파일), API 엔드포인트 통합 테스트 없음
- **파일**: `src/__tests__/` 에 api/ 디렉토리 추가
- **우선**: tenders, favorites, reports/summary 핵심 3개 API부터

### 11. E2E 테스트 없음
- **현황**: Playwright 미설치
- **해결**: `npx playwright init` + 로그인 → 검색 → 즐겨찾기 기본 플로우

### 12. vitest 커버리지 측정 없음
- **해결**: `package.json`에 `"test:coverage": "vitest run --coverage"` 추가

---

## 🟢 UX / 성능 — 여유 있을 때

### 13. 트렌딩 키워드가 하드코딩
- **파일**: `src/app/(app)/page.tsx` L65
- **해결**: `/api/tenders/trending` 엔드포인트로 실시간 집계

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
NEXT_PUBLIC_SUPABASE_URL         ✅ 설정됨
NEXT_PUBLIC_SUPABASE_ANON_KEY    ✅ 설정됨
SUPABASE_SERVICE_ROLE_KEY        ✅ 설정됨
NARA_API_KEY                     ✅ 설정됨
RESEND_API_KEY                   ✅ 설정됨
CRON_SECRET                      ✅ 설정됨 (vercel.json cron 보호)
```

---

## 완료 기준 — v1.0 정식 출시

- [ ] Rate limiting 적용
- [ ] `/terms`, `/privacy` 페이지 생성
- [ ] plan limit 즐겨찾기 POST 보호
- [ ] 사용자 설정 페이지
- [ ] API 라우트 테스트 10개 이상
- [ ] E2E smoke test 통과
