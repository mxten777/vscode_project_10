# 작업 세션 로그 — 2026-03-10

## 개요

이메일 알림 파이프라인 엔드-투-엔드 완성 및 커스텀 도메인 설정.

---

## 최종 결과

| 항목 | 결과 |
|------|------|
| 이메일 발송 | ✅ `noreply@baikalsys.kr` |
| 받은 편지함 | ✅ 스팸 없이 Gmail 수신함 도착 |
| 발송 건수 | `sent:25, failed:0` |
| 도메인 인증 | ✅ 2026-03-10 18:34 (Resend, baikalsys.kr) |

---

## 해결한 문제들

### 1. mxten777@gmail.com — 알림 규칙 생성 실패
- **원인**: `org_members` 테이블에 레코드 없음 → `orgId = null`
- **해결**: SQL로 직접 INSERT
  ```sql
  INSERT INTO public.org_members (user_id, org_id, role)
  SELECT id, '5659cdb6-15fd-4b00-accc-0ed897b7bb6e', 'admin'
  FROM auth.users WHERE email = 'mxten777@gmail.com';
  ```

### 2. 이메일 발송 실패 (jngdy@naver.com)
- **원인**: Resend 무료 플랜에서 naver.com 수신 거부
- **해결**: `jngdy@naver.com` 계정 삭제, `mxten777@gmail.com` admin 승격

### 3. 이메일 스팸 분류
- **원인**: Resend 공유 도메인(`onboarding@resend.dev`) 사용
- **해결**: 커스텀 도메인 `baikalsys.kr` 설정 (아래 참조)

### 4. Resend 초당 2건 Rate Limit 초과
- **원인**: 이메일 연속 발송 시 `FAIL` 발생
- **해결**: 이메일 발송마다 600ms 딜레이 추가
  ```ts
  // src/app/api/jobs/process-alerts/route.ts
  await new Promise((r) => setTimeout(r, 600));
  ```
  - 커밋: `dac3eef` — "fix: Resend rate limit 방지 (600ms 딜레이)"

---

## Resend 커스텀 도메인 설정 (baikalsys.kr)

### 배경
- Resend 무료 플랜은 가입 이메일(`mxten777@gmail.com`)에만 발송 가능
- 커스텀 도메인 인증 시 → 임의 수신자에게 발송 가능
- 스팸 필터 회피: SPF, DKIM, DMARC를 직접 서명하므로 신뢰도 상승

### Resend 도메인 등록
- 도메인: `baikalsys.kr`
- 리전: `ap-northeast-1` (Tokyo)
- 인증 완료: 2026-03-10 18:34

### Gabia DNS 레코드 추가

| 타입 | 호스트 | 값 |
|------|--------|----|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBA...` (DKIM) |
| MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` (우선순위 10) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` (SPF) |
| TXT | `_dmarc` | `v=DMARC1; p=none;` (DMARC) |

### Vercel 환경변수 업데이트
```
ALERT_FROM_EMAIL=noreply@baikalsys.kr
```
- `vercel env add ALERT_FROM_EMAIL production` 후 재배포

---

## DB 변경사항

### 적용된 마이그레이션
- `supabase/migrations/001_stabilize.sql` — 프로덕션 DB 적용 완료
  - `alert_logs` UNIQUE 제약 (alert_rule_id, tender_id)
  - `alert_rules.name` 컬럼 추가
  - 인덱스 3개 추가

### 계정 정리
| 이메일 | 처리 |
|--------|------|
| `jngdy@naver.com` | Supabase auth.users에서 삭제 |
| `mxten777@gmail.com` | admin 승격, org_members 등록 유지 |

### 현재 DB 상태
- 사용자: `mxten777@gmail.com` 1명 (role=admin)
- org_id: `5659cdb6-15fd-4b00-accc-0ed897b7bb6e`
- 알림 규칙: 키워드 `공공 AI 시스템`, 채널 EMAIL, is_enabled=true
- alert_logs: 테스트 후 삭제됨 (중복 방지 UNIQUE 제약으로 재발송 차단된 후 초기화)

---

## 이메일 자동 발송 스케줄

> **vercel.json** Cron 설정 기준 (커밋 `4b80f75`)

| 작업 | Cron (UTC) | 한국 시간 (KST = UTC+9) | 실행 요일 |
|------|------------|------------------------|----------|
| `poll-tenders` (공고 수집) | `0 0 * * 1-5` | **매일 오전 9:00** | 평일(월~금) |
| `process-alerts` (이메일 발송) | `30 0 * * 1-5` | **매일 오전 9:30** | 평일(월~금) |

### 이메일 발송 규칙

| 상황 | 발송 내용 |
|------|-----------|
| 오늘 신규 공고 자체가 없음 | "오늘 신규 입찰 공고 없음" 안내 이메일 |
| 공고는 있지만 키워드 매칭 없음 | "오늘 조건에 맞는 공고 없음" 안내 이메일 |
| 매칭 공고 있음 | 공고 상세 정보 이메일 |

### 조건 정리
- 평일에만 동작 (토·일 발송 없음)
- **결과 없어도 매일 오전 9:30에 이메일 발송** (있음/없음 안내)
- 동일 (알림규칙, 공고) 조합은 `alert_logs` UNIQUE 제약으로 중복 발송 차단
- 새로 수집된 공고만 대상 (`tenders.created_at` 기준 최근 15분 이내)

---

## 코드 변경 커밋 목록

| 커밋 | 내용 |
|------|------|
| `45a1321` | feat: 다중 키워드 OR 매칭 (공백 구분) |
| `dac3eef` | fix: Resend rate limit 방지 (600ms 딜레이) |
| `4b80f75` | feat: cron KST 9:00/9:30 변경, 매칭 공고 없을 때 안내 이메일 발송 |

---

## 시스템 구성 요약

| 항목 | 값 |
|------|----|
| 프로젝트 URL | `https://bid-platform.vercel.app` |
| Vercel 리전 | `icn1` (Seoul) |
| Supabase 프로젝트 | `pdxjwpskwiinustgzhmb` (Seoul) |
| 이메일 발신 주소 | `noreply@baikalsys.kr` |
| Resend 리전 | `ap-northeast-1` (Tokyo) |
| 도메인 관리 | Gabia (`baikalsys.kr`) |

---

## 미완료 — 향후 작업 목록

### 🔴 우선순위 높음 (서비스 운영 필수)

| # | 항목 | 설명 | 관련 파일 |
|---|------|------|----------|
| 1 | **신규 회원가입 → org_members 자동 등록** | 지금은 수동 SQL 필요. 신규 가입자가 알림 규칙을 만들 수 없음 | `src/app/api/auth/signup/route.ts` |
| 2 | **알림 규칙 없는 사용자 처리** | process-alerts에서 알림 규칙이 0개면 아무 이메일도 안 감 | `process-alerts/route.ts` |
| 3 | **poll-tenders 15분 윈도우 문제** | Cron이 9:00에 수집하고 9:30에 process-alerts 실행 → 수집된 공고가 15분 윈도우 밖일 수 있음 → 윈도우를 60분으로 늘려야 안전 | `process-alerts/route.ts` |

### 🟡 우선순위 중간 (품질 개선)

| # | 항목 | 설명 | 관련 파일 |
|---|------|------|----------|
| 4 | **전체 사용자 플로우 테스트** | 회원가입 → 공고 검색 → 즐겨찾기 → 알림 규칙 → 리포트 순서로 실제 동작 확인 | — |
| 5 | **알림 규칙 이름 UI 반영** | `alert_rules.name` 컬럼 추가됐지만 UI에서 입력/표시 미구현 | `src/app/(app)/alerts/page.tsx` |
| 6 | **리포트 페이지 실데이터 연동** | 현재 더미 또는 미구현 상태인지 확인 필요 | `src/app/(app)/reports/page.tsx` |
| 7 | **에러 핸들링 개선** | API 에러 메시지 사용자 친화적 처리, toast 알림 일관성 | `src/lib/api-response.ts` |

### 🟢 우선순위 낮음 (완성도)

| # | 항목 | 설명 | 관련 파일 |
|---|------|------|----------|
| 8 | **SEO 메타태그** | 각 페이지 og:title, og:description, twitter:card | `src/app/**/page.tsx` |
| 9 | **이메일 템플릿 개선** | 현재 인라인 HTML → 브랜딩 반영된 디자인으로 개선 | `process-alerts/route.ts` |
| 10 | **카카오 알림톡 채널 활성화** | `kakao-provider.ts` 구현됐지만 실제 채널 미설정 | `src/lib/notifications/kakao-provider.ts` |
| 11 | **토큰 만료 자동 갱신** | 로그인 세션 만료 시 자동 재로그인 또는 안내 | `src/lib/supabase/client.ts` |
