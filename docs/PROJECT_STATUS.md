# AI 입찰·조달 분석 플랫폼 — 프로젝트 현황 보고서

> 최초 작성: 2026-02-27 / 최종 업데이트: 2026-03-10  
> 프로젝트: bid-platform  
> 버전: 0.2.0

---

## 1. 프로젝트 개요

나라장터(조달청) 입찰 공고를 자동 수집·분석하여 맞춤 알림을 제공하는 SaaS 플랫폼.

| 항목 | 값 |
|------|-----|
| 프로덕션 URL | https://bid-platform.vercel.app |
| GitHub | https://github.com/mxten777/vscode_project_10 |
| Supabase | `pdxjwpskwiinustgzhmb` (Seoul 리전) |
| 기술 스택 | Next.js 16.1.6, React 19, TypeScript, Tailwind CSS v4 |
| UI 라이브러리 | shadcn/ui (Radix UI) + recharts |
| DB/Auth | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel (Hobby Plan, icn1 Seoul 리전) |
| 총 커밋 | 37개 |

---

## 2. 완료된 작업

### Phase 0: 프로젝트 초기 설정
- [x] Next.js 16 + TypeScript + Tailwind CSS v4 프로젝트 생성
- [x] shadcn/ui 컴포넌트 설치 (20+ 컴포넌트)
- [x] ESLint, PostCSS 설정
- [x] 프로젝트 구조 설계 및 문서화 (10+ 문서)

### Phase 1: Supabase 연동
- [x] Supabase 프로젝트 생성 (Seoul 리전)
- [x] DB 스키마 배포 (8개 테이블: orgs, org_members, agencies, tenders, awards, favorites, alert_rules, alert_logs)
- [x] RLS(Row Level Security) 정책 설정
- [x] 인덱스 생성 (트리그램 검색 포함)
- [x] 트리거 설정 (updated_at 자동 갱신)
- [x] Supabase Auth 설정 (이메일/비밀번호)
- [x] 테스트 사용자 생성 및 로그인 검증
- [x] 테스트 데이터 삽입 (org, org_member, agency, tender)

### Phase 2: API 개발 (19개 엔드포인트)
| 카테고리 | 엔드포인트 | 설명 |
|----------|-----------|------|
| Auth | `/api/auth/signin` | 로그인 |
| Auth | `/api/auth/signup` | 회원가입 + org/org_member 자동 생성 |
| Auth | `/api/auth/signout` | 로그아웃 |
| Tenders | `/api/tenders` | 공고 목록 (필터/페이징) |
| Tenders | `/api/tenders/[id]` | 공고 상세 |
| Favorites | `/api/favorites` | 즐겨찾기 목록 |
| Favorites | `/api/favorites/[tenderId]` | 즐겨찾기 추가/삭제 |
| Alerts | `/api/alerts/rules` | 알림 규칙 CRUD |
| Alerts | `/api/alerts/rules/[id]` | 알림 규칙 상세/수정/삭제 |
| Alerts | `/api/alerts/logs` | 알림 발송 로그 |
| Reports | `/api/reports/summary` | 리포트 집계 |
| Jobs | `/api/jobs/poll-tenders` | 나라장터 API 폴링 (Cron, 평일 09:00 UTC) |
| Jobs | `/api/jobs/process-alerts` | 알림 처리 (Cron, 평일 09:30 UTC) |
| Health | `/api/health` | 헬스체크 |

### Phase 3: 프론트엔드 페이지
- [x] 로그인 페이지 (`/login`) — 분할 레이아웃(히어로 패널)
- [x] 대시보드/공고 목록 (`/`) — 카테고리 칩, 트렌딩 키워드, 통계 카드
- [x] 공고 상세 (`/tenders/[id]`)
- [x] 즐겨찾기 (`/favorites`)
- [x] 알림 관리 (`/alerts`)
- [x] 리포트 (`/reports`) — PieChart, BarChart (recharts)
- [x] 공통 헤더/네비게이션 — glassmorphism, 아바타 드롭다운, 다크모드 토글
- [x] AuthContext (인증 상태 관리)
- [x] React Query 기반 데이터 패칭

### Phase 4: 외부 API 연동
- [x] 나라장터(공공데이터포털) API 키 발급 (2개 서비스 승인)
  - Encoding Key: `w%2FP304CJjlu5%2F...`
  - Decoding Key: `64bb283bc6fb4e5b...`
- [x] poll-tenders API 구현 (재시도/백오프 로직 포함)
- [x] process-alerts API 구현 (키워드/필터 매칭 + 알림 발송)

### Phase 5: 초기 배포
- [x] Git 초기화 및 GitHub 푸시 (78 파일, 16,333줄)
- [x] Vercel 프로젝트 생성 (`bid-platform`)
- [x] 환경 변수 7개 등록 (newline 이슈 해결)
- [x] Resend lazy-init 수정 (API 키 미설정 시 빌드 오류 해결)
- [x] Cron 스케줄 조정 (`0 9 * * 1-5` — 평일 09:00 UTC, Hobby 플랜 제한 대응)
- [x] 프로덕션 배포 성공 + Health Check 확인
- [x] Supabase Auth URL 설정 (Site URL + Redirect URL)
- [x] 불필요한 `vscode-project-10` Vercel 프로젝트 삭제

### Phase 6: UI/UX 전면 개편 (Premium)
- [x] Indigo 브랜드 컬러 + 다크 모드 지원 (`next-themes`)
- [x] Glassmorphism 헤더 (아바타 드롭다운, 비밀번호 변경 다이얼로그)
- [x] 로그인 페이지 분할 레이아웃 (히어로 패널)
- [x] 대시보드 통계 카드, 페이드업/스태거 애니메이션
- [x] Mesh gradient 배경, 카드 hover 마이크로 애니메이션
- [x] 리포트 페이지 recharts 차트 (PieChart, BarChart)
- [x] 반응형 모바일 네비게이션 (애니메이션)
- [x] 빈 상태(Empty State) 일러스트 개선
- [x] 로그아웃 시 전체 페이지 리로드 (캐시 상태 초기화)
- [x] 데모 데이터 시드 스크립트 (`scripts/seed-demo.mjs`)

### Phase 7: 코드 품질·보안 강화
- [x] `middleware.ts` → `proxy.ts` 리네임 (Next.js 16 컨벤션)
- [x] 중복 `middleware.ts` 파일 제거 (빌드 오류 해결)
- [x] 하드코딩된 Supabase Service Key 제거 → 환경변수 전환 (보안)
- [x] `command.tsx` 미사용 컴포넌트 제거
- [x] `sleep` 헬퍼 내부 전용으로 unexport
- [x] alert_logs 중복 알림 방지 UNIQUE 제약 추가 (DB Migration 001)
- [x] alert_rules `name` 컬럼 추가 (Migration 001)
- [x] tenders/alert_logs 쿼리 최적화 인덱스 추가 (Migration 001)
- [x] batch upsert 최적화 (기관 1회 쿼리, 공고 1회 쿼리)
- [x] TOCTOU 경쟁 조건 수정
- [x] `raw_json`/에러 메시지 마스킹 (정보 노출 방지)
- [x] CRON_SECRET 미설정 시 서비스 시작 거부 가드 추가

### Phase 8: 나라장터 API 연동 안정화
- [x] 조달청 운영계정 API endpoint로 전환 (`/ad/BidPublicInfoService/getBidPblancListInfoServc`)
- [x] Vercel 서버리스 함수 Seoul 리전(icn1) 고정 (한국 IP 요건 충족)
- [x] API 키 `.trim()` 처리 (Vercel 환경변수 줄바꿈 방지)
- [x] 날짜 형식 수정 (12자리 `YYYYMMDDHHMMSS`)
- [x] URL 인코딩 이중 인코딩 버그 수정
- [x] PostgreSQL upsert 중복 페이로드 중복 제거 수정
- [x] 에러 직렬화 개선 (Error 객체 JSON 변환)
- [x] 디버그 코드 완전 제거 (프로덕션 정리)

### Phase 8: org 자동 생성
- [x] 회원가입 시 org + org_member(admin) 자동 생성 완료
  - 즐겨찾기, 알림 규칙 등 RLS 의존 기능 정상 작동

---

## 3. 해결된 이슈 전체 목록

| 이슈 | 원인 | 해결 |
|------|------|------|
| 환경변수 newline | PowerShell 파이프 자동 줄바꿈 | Node.js `execSync` + `input` 옵션으로 재등록 |
| Resend 빌드 오류 | `new Resend()` 모듈 로드 시 즉시 실행 | 지연 초기화(lazy-init) + null guard |
| Cron 배포 실패 | Hobby 플랜 일 1회 제한 | `*/10 * * * *` → `0 9 * * 1-5` 변경 |
| 잘못된 Vercel 프로젝트 | 상위 폴더에서 첫 배포 실행 | `bid-platform/` 디렉토리에서 재배포 |
| 나라장터 API 500 | 개발계정 endpoint 사용 | 운영계정 endpoint로 전환 |
| 나라장터 API 한국 IP 차단 | Vercel 기본 리전(미국) | `preferredRegion = "icn1"` 설정 |
| API 키 오류 | Vercel 환경변수에 줄바꿈 포함 | `.trim()` 처리 |
| 날짜 파라미터 오류 | 날짜 형식 불일치 | `YYYYMMDDHHMMSS` 12자리로 수정 |
| URL 이중 인코딩 | serviceKey를 fetch URL에 다시 인코딩 | raw key를 URL에 직접 삽입 |
| DB upsert 충돌 | 동일 source_tender_id 중복 페이로드 | Map으로 중복 제거 후 upsert |
| 빌드 오류 (middleware) | middleware.ts + proxy.ts 중복 존재 | middleware.ts 삭제 |
| 보안 — 키 하드코딩 | seed 스크립트에 Service Key 노출 | 환경변수(`SUPABASE_SERVICE_ROLE_KEY`) 전환 |
| 로그아웃 후 상태 잔류 | React Query 캐시 미초기화 | `window.location.href` 풀 리로드 |
| RLS 기능 불가 | 회원가입 시 org 미생성 | signup API에 org + org_member 자동 생성 추가 |

---

## 4. 현재 인프라 구성

```
┌─────────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   Vercel (Hobby)    │    │  Supabase        │    │ 나라장터 API       │
│   리전: icn1 (Seoul)│    │  (Seoul, Free)   │    │ (data.go.kr)      │
│                     │    │                  │    │                    │
│ ├ Next.js App       │◄──►│ ├ PostgreSQL     │◄───│ ├ 입찰공고목록조회  │
│ ├ API Routes (19)   │    │ ├ Auth           │    │ └ 개찰결과조회      │
│ ├ Cron Jobs (2)     │───►│ ├ RLS Policies   │    │                    │
│ │  ├ 평일 09:00 UTC │    │ ├ 8 Tables       │    │  ✅ 운영계정 연동   │
│ │  └ 평일 09:30 UTC │    │ └ Migration 001  │    │                    │
│ └ Static Pages (6)  │    │                  │    │                    │
└─────────────────────┘    └──────────────────┘    └────────────────────┘
        │
        │   GitHub (auto deploy on push)
        └──► mxten777/vscode_project_10 (master)
```

### Vercel 환경 변수 (Production)

| 변수명 | 용도 | 상태 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 등록 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 | ✅ 등록 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 | ✅ 등록 |
| `CRON_SECRET` | Cron Job 인증 | ✅ 등록 |
| `NARA_API_KEY` | 나라장터 API 키 (Encoding) | ✅ 등록 |
| `NARA_API_BASE_URL` | 나라장터 API 베이스 URL | ✅ 등록 |
| `NEXT_PUBLIC_APP_URL` | 앱 프로덕션 URL | ✅ 등록 |
| `RESEND_API_KEY` | 이메일 알림 (Resend) | ⚠️ 미등록 (이메일 발송 비활성) |

### Git 커밋 이력 (최신 10개)

```
2215402 chore: remove debug code from poll-tenders
cf89ccf fix: deduplicate tender payloads to prevent PostgreSQL upsert conflict error
ab18ccb debug: better error serialization
4d641a7 debug: expose error message in POST handler
896df17 debug: add GET endpoint for NARA API diagnosis
d4d8b8b fix: trim NARA_API_KEY to remove potential newlines from Vercel env
b611743 feat: switch to NARA production API endpoint, fix date format to 12-digit
a756d45 revert: restore production poll-tenders, remove all debug code
67890c9 debug: add GET test endpoint for raw NARA API response
ebb1a24 debug: xml response + key length check
```

---

## 5. 남은 작업 목록

### 🟡 중요 (기능 완성)

| # | 작업 | 설명 | 난이도 |
|---|------|------|--------|
| 1 | **Resend API 키 발급** | https://resend.com 가입 → API Key 발급 → Vercel 환경변수 `RESEND_API_KEY` 등록. 이메일 알림 기능 활성화 | 낮음 |
| 2 | **Cron Job 실제 수집 확인** | 나라장터 데이터가 DB에 실제로 적재되는지 확인. `curl -X POST https://bid-platform.vercel.app/api/jobs/poll-tenders -H "Authorization: Bearer {CRON_SECRET}"` | 낮음 |
| 3 | ~~**Migration 001 Supabase 적용**~~ ✅ | `supabase/migrations/001_stabilize.sql` Supabase Dashboard > SQL Editor 실행 완료 (2026-03-10) | 완료 |
| 4 | **전체 사용자 플로우 테스트** | 회원가입 → 로그인 → 공고 조회 → 즐겨찾기 → 알림 규칙 생성 → 리포트 차트 | 중간 |
| 5 | **에러 핸들링 강화** | API 에러 시 사용자 친화적 메시지, 네트워크 오류 재시도 UI | 중간 |

### 🟢 개선 (품질 향상)

| # | 작업 | 설명 | 난이도 |
|---|------|------|--------|
| 6 | **SEO 메타태그** | 각 페이지 title, description, og:image 설정 | 낮음 |
| 7 | **반응형 디자인 최종 검증** | 모바일/태블릿 레이아웃 전 페이지 테스트 | 중간 |
| 8 | **공고 상세 페이지 강화** | 유사 공고 추천, 지원하기 버튼 링크 | 중간 |

### 🔵 고도화 (로드맵 Phase 1~5)

| # | 작업 | 설명 |
|---|------|------|
| 9 | **배치 파이프라인 고도화** | QStash/Redis 기반 비동기 큐, 데드레터큐 |
| 10 | **검색 고도화** | OpenSearch + Nori 한국어 형태소 분석기 |
| 11 | **예측 모델** | FastAPI + XGBoost 낙찰률 예측 |
| 12 | **멀티테넌시 & 결제** | 플랜 체계(Free/Pro/Enterprise) + 토스페이먼츠 |
| 13 | **Kakao 알림톡 실발송** | Provider 인터페이스 준비됨, Kakao 비즈메시지 API 연동 필요 |
| 14 | **모니터링** | Sentry 에러 트래킹 + Upstash Monitor |
| 15 | **Vercel Pro 업그레이드** | Cron 10분 간격 복원, 더 빠른 빌드, 분석 기능 |

---

## 6. 재배포 방법

### 코드 수정 후 자동 배포 (권장)
```bash
cd bid-platform
git add .
git commit -m "feat: 변경 내용 설명"
git push origin master
# → Vercel이 자동으로 빌드 & 배포
```

### 수동 배포 (CLI)
```bash
cd bid-platform
vercel --prod --yes
```

### 환경 변수 수정
```bash
# 삭제
vercel env rm 변수명 production --yes

# 추가 (cmd 경유로 newline 방지)
cmd /c "echo|set /p=값| vercel env add 변수명 production"

# 또는 Node.js 스크립트 사용
node -e "require('child_process').execSync('vercel env add 변수명 production', {input: '값'})"
```

---

## 7. 주요 접속 정보

| 서비스 | URL |
|--------|-----|
| 프로덕션 사이트 | https://bid-platform.vercel.app |
| Vercel Dashboard | https://vercel.com/dongyeol-jungs-projects/bid-platform |
| Supabase Dashboard | https://supabase.com/dashboard/project/pdxjwpskwiinustgzhmb |
| GitHub Repository | https://github.com/mxten777/vscode_project_10 |
| 공공데이터포털 | https://www.data.go.kr/mypage/main.do |
| Health Check | https://bid-platform.vercel.app/api/health |
