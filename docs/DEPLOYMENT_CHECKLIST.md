# 🚢 배포 체크리스트

> **프로덕션 배포 전 필수 확인 사항**  
> 최종 업데이트: 2026-03-14  
> 플랫폼: Vercel + Supabase

---

## 📋 배포 전 체크리스트

### 1️⃣ 환경 설정

- [ ] **Supabase 프로젝트 생성**
  - [ ] 프로젝트 생성 완료
  - [ ] `schema.sql` 전체 실행 완료
  - [ ] `pg_trgm` 확장 활성화 확인
  - [ ] RLS (Row Level Security) 활성화 확인

- [ ] **Supabase Migrations 실행**
  - [ ] `001_stabilize.sql` 적용
  - [ ] `002_auto_org_on_signup.sql` 적용
  - [ ] `003_add_delete_policy.sql` 적용

- [ ] **API 키 발급**
  - [ ] 나라장터 API 키 발급 완료 (`apis.data.go.kr`)
  - [ ] Resend API 키 발급 완료 (이메일 발송용)
  - [ ] Supabase URL 및 키 복사 완료
  - [ ] Cron Secret 생성 (32자 이상 랜덤 문자열)

### 2️⃣ Vercel 배포

- [ ] **GitHub 저장소 연결**
  - [ ] 코드 GitHub에 푸시 완료
  - [ ] Vercel에서 저장소 import 완료
  - [ ] 빌드 성공 확인

- [ ] **환경 변수 설정**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` (Production)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (Production)
  - [ ] `NARAMARKET_API_KEY` (Production)
  - [ ] `RESEND_API_KEY` (Production)
  - [ ] `CRON_SECRET` (Production)
  - [ ] Preview/Development 환경도 동일하게 설정

- [ ] **Cron 작업 설정**
  - [ ] `vercel.json` 파일 존재 확인
  - [ ] Vercel Dashboard > Cron Jobs 메뉴에서 등록 확인
  - [ ] 평일 09:00 UTC (공고 수집) 스케줄 확인
  - [ ] 평일 09:30 UTC (알림 발송) 스케줄 확인

- [ ] **도메인 설정 (선택)**
  - [ ] 커스텀 도메인 연결
  - [ ] SSL 인증서 자동 발급 확인

### 3️⃣ 기능 검증

- [ ] **인증 시스템**
  - [ ] 회원가입 정상 작동
  - [ ] 로그인 정상 작동
  - [ ] 로그아웃 정상 작동
  - [ ] 세션 유지 확인
  - [ ] 조직 자동 생성 확인

- [ ] **공고 시스템**
  - [ ] 공고 목록 조회 정상
  - [ ] 검색/필터링 정상
  - [ ] 페이지네이션 정상
  - [ ] 공고 상세 페이지 정상

- [ ] **즐겨찾기**
  - [ ] 즐겨찾기 추가 정상
  - [ ] 즐겨찾기 삭제 정상
  - [ ] 즐겨찾기 목록 조회 정상
  - [ ] 중복 추가 방지 확인

- [ ] **알림 시스템**
  - [ ] 알림 규칙 생성 정상
  - [ ] 알림 규칙 수정 정상
  - [ ] 알림 규칙 삭제 정상
  - [ ] 알림 발송 로그 조회 정상

- [ ] **리포트**
  - [ ] 기간별 통계 조회 정상
  - [ ] 기관별 집계 정상
  - [ ] 업종별 집계 정상

### 4️⃣ Cron 작업 테스트

- [ ] **공고 수집 작업**
  ```bash
  curl -X POST https://your-app.vercel.app/api/jobs/poll-tenders \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
  - [ ] 응답 성공 (200 OK)
  - [ ] DB에 공고 데이터 추가 확인
  - [ ] 중복 수집 시 upsert 정상 작동

- [ ] **알림 발송 작업**
  ```bash
  curl -X POST https://your-app.vercel.app/api/jobs/process-alerts \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
  - [ ] 응답 성공 (200 OK)
  - [ ] 알림 조건 매칭 정상
  - [ ] 이메일 발송 성공
  - [ ] 중복 발송 방지 확인
  - [ ] `alert_logs` 테이블 기록 확인

### 5️⃣ 보안 점검

- [ ] **RLS 정책 확인**
  - [ ] `favorites` 테이블: 본인 조직만 접근
  - [ ] `alert_rules` 테이블: 본인 조직만 접근
  - [ ] `alert_logs` 테이블: 본인 조직만 접근
  - [ ] `tenders` 테이블: 전체 읽기 허용
  - [ ] `orgs` 테이블: 제한된 접근

- [ ] **환경 변수 보안**
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` 클라이언트 노출 안됨
  - [ ] `CRON_SECRET` 외부 노출 안됨
  - [ ] `.env.local` 파일 `.gitignore`에 포함

- [ ] **API 인증**
  - [ ] 인증 필요 엔드포인트 미들웨어 동작 확인
  - [ ] Cron 엔드포인트 Bearer Token 검증 확인
  - [ ] 401/403 에러 정상 반환

### 6️⃣ 성능 최적화

- [ ] **데이터베이스**
  - [ ] 인덱스 13개 모두 생성 확인
  - [ ] `pg_trgm` GIN 인덱스 동작 확인
  - [ ] 쿼리 성능 모니터링 (Supabase Dashboard)

- [ ] **프론트엔드**
  - [ ] Lighthouse 점수 확인 (Performance > 80)
  - [ ] TanStack Query 캐싱 동작 확인
  - [ ] 이미지 최적화 (Next.js Image)
  - [ ] 번들 크기 확인 (< 300KB)

- [ ] **API**
  - [ ] 응답 시간 < 500ms (평균)
  - [ ] 에러 핸들링 정상
  - [ ] Rate Limiting 고려 (향후)

### 7️⃣ 모니터링 설정

- [ ] **Vercel Analytics**
  - [ ] 기본 Analytics 활성화
  - [ ] Speed Insights 활성화

- [ ] **Supabase Monitoring**
  - [ ] Database 사용량 모니터링
  - [ ] API 호출량 모니터링
  - [ ] 스토리지 사용량 확인

- [ ] **에러 트래킹 (선택)**
  - [ ] Sentry 연동 (권장)
  - [ ] 에러 알림 설정

### 8️⃣ 문서화

- [ ] `README.md` 최신화 완료
- [ ] `ARCHITECTURE.md` 최신화 완료
- [ ] `API_SPECIFICATION.md` 검토 완료
- [ ] `.env.example` 파일 업데이트

### 9️⃣ 백업 계획

- [ ] **데이터베이스 백업**
  - [ ] Supabase 자동 백업 활성화 확인
  - [ ] 수동 백업 스크립트 준비

- [ ] **환경 변수 백업**
  - [ ] 안전한 장소에 환경 변수 저장
  - [ ] 팀원과 공유 (보안 저장소)

### 🔟 배포 후 확인

- [ ] **Health Check**
  ```bash
  curl https://your-app.vercel.app/api/health
  ```
  - [ ] `status: "ok"` 응답 확인
  - [ ] `database: "connected"` 확인

- [ ] **실제 사용자 테스트**
  - [ ] 신규 회원가입 실행
  - [ ] 공고 검색 실행
  - [ ] 즐겨찾기 추가/삭제
  - [ ] 알림 규칙 생성
  - [ ] 리포트 조회

- [ ] **Cron 작업 모니터링**
  - [ ] 첫 번째 Cron 실행 성공 확인
  - [ ] Vercel Dashboard에서 로그 확인
  - [ ] 에러 발생 시 즉시 대응

---

## 🚨 긴급 롤백 절차

배포 후 심각한 문제 발생 시:

### 1. Vercel 롤백
```bash
# 이전 배포로 즉시 롤백
vercel rollback
```
또는 Vercel Dashboard > Deployments > "..." > Rollback

### 2. 데이터베이스 롤백
```sql
-- Supabase SQL Editor에서 필요 시 실행
-- 백업 데이터로 복원
```

### 3. 환경 변수 복구
- Vercel Dashboard > Settings > Environment Variables
- 이전 값으로 복구 후 재배포

---

## 📊 핵심 메트릭 모니터링

배포 후 첫 주간 모니터링할 지표:

| 항목 | 목표 | 확인 방법 |
|------|------|-----------|
| **응답 시간** | < 500ms | Vercel Analytics |
| **에러율** | < 1% | Vercel Dashboard |
| **Cron 성공률** | 100% | Vercel Cron Logs |
| **DB 사용량** | < 50% | Supabase Dashboard |
| **활성 사용자** | - | Supabase Auth |

---

## 🔗 유용한 링크

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [나라장터 API 관리](https://www.data.go.kr/mypage/useAPI)
- [Resend Dashboard](https://resend.com/overview)

---

## ✅ 배포 승인

- [ ] **모든 체크리스트 완료**
- [ ] **팀 리뷰 완료**
- [ ] **백업 계획 수립 완료**
- [ ] **롤백 절차 숙지 완료**

**배포 담당자**: ___________________  
**배포 일시**: ___________________  
**승인자**: ___________________  

---

**🎉 배포 완료 축하합니다!**

배포 후 첫 24시간 동안 모니터링을 강화하고, 사용자 피드백을 적극 수집하세요.
