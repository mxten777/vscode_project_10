# AI 입찰·조달 분석 플랫폼 — 프로젝트 현황 보고서

> 작성일: 2026-02-27  
> 프로젝트: bid-platform  
> 버전: 0.1.0 (MVP)

---

## 1. 프로젝트 개요

나라장터(조달청) 입찰 공고를 자동 수집·분석하여 맞춤 알림을 제공하는 SaaS 플랫폼.

| 항목 | 값 |
|------|-----|
| 프로덕션 URL | https://bid-platform.vercel.app |
| GitHub | https://github.com/mxten777/vscode_project_10 |
| Supabase | `pdxjwpskwiinustgzhmb` (Seoul 리전) |
| 기술 스택 | Next.js 16.1.6, React 19, TypeScript, Tailwind CSS v4 |
| UI 라이브러리 | shadcn/ui (Radix UI) |
| DB/Auth | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel (Hobby Plan) |

---

## 2. 완료된 작업

### Phase 0: 프로젝트 초기 설정
- [x] Next.js 16 + TypeScript + Tailwind CSS v4 프로젝트 생성
- [x] shadcn/ui 컴포넌트 설치 (20+ 컴포넌트)
- [x] ESLint, PostCSS 설정
- [x] 프로젝트 구조 설계 및 문서화 (7개 문서)

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
| Auth | `/api/auth/signup` | 회원가입 |
| Auth | `/api/auth/signout` | 로그아웃 |
| Tenders | `/api/tenders` | 공고 목록 (필터/페이징) |
| Tenders | `/api/tenders/[id]` | 공고 상세 |
| Favorites | `/api/favorites` | 즐겨찾기 목록 |
| Favorites | `/api/favorites/[tenderId]` | 즐겨찾기 추가/삭제 |
| Alerts | `/api/alerts/rules` | 알림 규칙 CRUD |
| Alerts | `/api/alerts/rules/[id]` | 알림 규칙 상세/수정/삭제 |
| Alerts | `/api/alerts/logs` | 알림 발송 로그 |
| Reports | `/api/reports/summary` | 리포트 집계 |
| Jobs | `/api/jobs/poll-tenders` | 나라장터 API 폴링 (Cron) |
| Jobs | `/api/jobs/process-alerts` | 알림 처리 (Cron) |
| Health | `/api/health` | 헬스체크 |

### Phase 3: 프론트엔드 페이지
- [x] 로그인 페이지 (`/login`)
- [x] 대시보드/공고 목록 (`/`)
- [x] 공고 상세 (`/tenders/[id]`)
- [x] 즐겨찾기 (`/favorites`)
- [x] 알림 관리 (`/alerts`)
- [x] 리포트 (`/reports`)
- [x] 공통 헤더/네비게이션
- [x] AuthContext (인증 상태 관리)
- [x] React Query 기반 데이터 패칭

### Phase 4: 외부 API 연동
- [x] 나라장터(공공데이터포털) API 키 발급 (2개 서비스 승인)
  - Encoding Key: `w%2FP304CJjlu5%2F...`
  - Decoding Key: `64bb283bc6fb4e5b...`
- [x] poll-tenders API 구현 (재시도/백오프 로직 포함)
- [x] process-alerts API 구현 (키워드/필터 매칭 + 알림 발송)

### Phase 5: 배포
- [x] Git 초기화 및 GitHub 푸시 (78 파일, 16,333줄)
- [x] Vercel 프로젝트 생성 (`bid-platform`)
- [x] 환경 변수 7개 등록 (newline 이슈 해결)
- [x] Resend lazy-init 수정 (API 키 미설정 시 빌드 오류 해결)
- [x] Cron 스케줄 조정 (`0 9 * * *` — Hobby 플랜 제한)
- [x] 프로덕션 배포 성공 + Health Check 확인
- [x] Supabase Auth URL 설정 (Site URL + Redirect URL)
- [x] 불필요한 `vscode-project-10` Vercel 프로젝트 삭제

### Phase 5-1: 배포 중 해결한 이슈들
| 이슈 | 원인 | 해결 |
|------|------|------|
| 환경변수 newline | PowerShell 파이프가 자동 줄바꿈 추가 | Node.js `execSync` + `input` 옵션으로 재등록 |
| Resend 빌드 오류 | `new Resend()` 모듈 로드 시 즉시 실행 | 지연 초기화(lazy-init) + null guard 패턴 |
| Cron 배포 실패 | Hobby 플랜은 일 1회만 허용 | `*/10 * * * *` → `0 9 * * *` 변경 |
| 잘못된 Vercel 프로젝트 | 상위 폴더에서 첫 배포 실행 | 올바른 `bid-platform/` 디렉토리에서 재배포 |
| 나라장터 API 500 | 조달청 API 서버 자체 장애 | 서버 복구 대기 (프로젝트 코드 문제 아님) |

---

## 3. 현재 인프라 구성

```
┌─────────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   Vercel (Hobby)    │    │  Supabase        │    │ 나라장터 API       │
│                     │    │  (Seoul, Free)   │    │ (data.go.kr)      │
│ ├ Next.js App       │◄──►│ ├ PostgreSQL     │    │                    │
│ ├ API Routes (19)   │    │ ├ Auth           │    │ ├ 입찰공고목록조회  │
│ ├ Cron Jobs (2)     │───►│ ├ RLS Policies   │    │ └ 개찰결과조회      │
│ │  └ 매일 09:00 UTC │    │ └ 8 Tables       │    │                    │
│ └ Static Pages (6)  │    │                  │    │   (현재 서버 장애)  │
└─────────────────────┘    └──────────────────┘    └────────────────────┘
        │                          │
        │   GitHub                 │
        └──► mxten777/             │
             vscode_project_10     │
             (auto deploy on push) │
                                   │
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

### Git 커밋 이력

```
d9bd22a fix: lazy-init Resend to avoid build error when API key missing
8c4d388 fix: update cron to daily schedule for Hobby plan
dde7295 feat: AI 입찰조달 분석 플랫폼 MVP 구현
de85277 Initial commit from Create Next App
```

---

## 4. 남은 작업 목록

### 🔴 긴급 (블로커)

| # | 작업 | 설명 | 난이도 |
|---|------|------|--------|
| 1 | **나라장터 API 테스트** | 조달청 서버 복구 후 Cron Job 동작 확인. `curl -X POST https://bid-platform.vercel.app/api/jobs/poll-tenders -H "Authorization: Bearer {CRON_SECRET}"` | 낮음 |

### 🟡 중요 (기능 완성)

| # | 작업 | 설명 | 난이도 |
|---|------|------|--------|
| 2 | **Resend API 키 발급** | https://resend.com 가입 → API Key 발급 → Vercel 환경변수 `RESEND_API_KEY` 등록. 이메일 알림 기능 활성화 | 낮음 |
| 3 | **프로덕션 기능 테스트** | 로그인 → 공고 조회 → 즐겨찾기 → 알림 규칙 생성 → 리포트. 전체 사용자 플로우 검증 | 중간 |
| 4 | **로그인 후 org 자동 생성** | 현재 회원가입 시 org/org_member가 자동 생성되지 않아 RLS 관련 기능(즐겨찾기, 알림) 사용 불가. signup API에 기본 org 생성 로직 추가 필요 | 중간 |
| 5 | **에러 핸들링 강화** | API 에러 시 사용자 친화적 메시지, 네트워크 오류 재시도 UI | 중간 |

### 🟢 개선 (품질 향상)

| # | 작업 | 설명 | 난이도 |
|---|------|------|--------|
| 6 | **middleware → proxy 마이그레이션** | Next.js 16에서 middleware 폐기 경고. `proxy` 파일 컨벤션으로 전환 | 중간 |
| 7 | **로딩/에러 UI 개선** | Skeleton 로딩, 에러 바운더리, 빈 상태(empty state) 디자인 | 중간 |
| 8 | **반응형 디자인 검증** | 모바일/태블릿 레이아웃 테스트 및 수정 | 중간 |
| 9 | **SEO 메타태그** | 각 페이지 title, description, og:image 설정 | 낮음 |
| 10 | **다크 모드** | next-themes 기반 다크/라이트 테마 전환 (이미 설치됨) | 낮음 |

### 🔵 고도화 (로드맵 Phase 1~5)

| # | 작업 | 설명 | 기간 |
|---|------|------|------|
| 11 | **배치 파이프라인 고도화** | QStash/Redis 기반 비동기 큐, 데드레터큐 | Week 5-6 |
| 12 | **검색 고도화** | OpenSearch + Nori 한국어 형태소 분석기 | Week 7-8 |
| 13 | **분석·집계 고도화** | 파티셔닝, ClickHouse, 차트(recharts) | Week 9-10 |
| 14 | **예측 모델** | FastAPI + XGBoost 낙찰률 예측 | Week 11-14 |
| 15 | **멀티테넌시 & 결제** | 플랜 체계(Free/Pro/Enterprise) + 토스페이먼츠 | Week 15-16 |
| 16 | **Kakao 알림톡 실발송** | Provider 인터페이스는 준비됨, Kakao 비즈메시지 API 연동 | - |
| 17 | **모니터링** | Sentry 에러 트래킹 + Upstash Monitor | - |
| 18 | **Vercel Pro 업그레이드** | Cron 10분 간격 복원, 더 빠른 빌드, 분석 기능 | - |

---

## 5. 재배포 방법

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

## 6. 주요 접속 정보

| 서비스 | URL |
|--------|-----|
| 프로덕션 사이트 | https://bid-platform.vercel.app |
| Vercel Dashboard | https://vercel.com/dongyeol-jungs-projects/bid-platform |
| Supabase Dashboard | https://supabase.com/dashboard/project/pdxjwpskwiinustgzhmb |
| GitHub Repository | https://github.com/mxten777/vscode_project_10 |
| 공공데이터포털 | https://www.data.go.kr/mypage/main.do |
| Health Check | https://bid-platform.vercel.app/api/health |
