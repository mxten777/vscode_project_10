# AI 입찰 의사결정 플랫폼 — 적용 순서 체크리스트

> 이 문서는 이번 업그레이드(실데이터 기반 AI 입찰 플랫폼 고도화)를 적용하는 순서를 설명합니다.

---

## 1단계 — Supabase 마이그레이션 적용

1. Supabase 대시보드 → **SQL Editor** 열기
2. `supabase/migrations/026_ai_decision_platform.sql` 내용을 붙여넣고 실행
3. 다음 테이블이 생성됐는지 확인:
   - `bid_participants`
   - `agency_analysis`
   - `industry_analysis`
   - `region_analysis`
4. 다음 RPC 함수가 생성됐는지 확인 (SQL Editor에서 실행):
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
     AND routine_name LIKE '%analysis%' OR routine_name LIKE 'get_%';
   ```

---

## 2단계 — 분석 캐시 초기 구축 (최초 1회)

Supabase SQL Editor에서 실행:
```sql
SELECT rebuild_all_analysis();
```

이 함수가 호출하는 세부 함수들:
- `rebuild_agency_analysis()` — 기관별 낙찰률·참가자수 집계
- `rebuild_industry_analysis()` — 업종별 집계
- `rebuild_region_analysis()` — 지역별 집계
- `sync_agency_counts()` — agencies 테이블 카운트 동기화

결과 확인:
```sql
SELECT * FROM agency_analysis LIMIT 5;
SELECT * FROM industry_analysis LIMIT 5;
SELECT audit_data_coverage();
```

---

## 3단계 — Vercel 배포

1. 변경된 파일을 Git commit & push
2. Vercel 자동 배포 완료 후 **Cron Jobs** 탭에서 확인:
   - `collect-bid-awards` → `0 0,9 * * 1-5` (평일 2회)
   - `poll-tenders` → `0 0,9 * * 1-5` (평일 2회)  
   - `rebuild-analysis` → `0 20 * * *` (매일 05:00 KST)

---

## 4단계 — 과거 낙찰 데이터 백필 (선택)

최근 3개월치 데이터가 없으면 수동 백필 실행:
```bash
curl -X POST \
  "https://YOUR_DOMAIN/api/jobs/backfill-awards?months=3" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

`months` 파라미터: `3` | `6` | `12` (기간이 길수록 오래 걸림, 최대 300초)

---

## 5단계 — 환경변수 확인

Vercel 환경변수에 다음이 모두 설정됐는지 확인:
| 변수 | 설명 |
|---|---|
| `NARA_API_KEY` | 나라장터 OpenAPI 인증키 |
| `CRON_SECRET` | Cron Job 인증 시크릿 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 |

---

## 6단계 — UI 동작 확인

### 대시보드 (`/`)
- [ ] 트렌딩 키워드 섹션이 "이번 주 주목 업종"으로 표기되고 실제 업종명이 표시됨
- [ ] 데이터 미수집 시 기존 하드코딩 목록으로 graceful fallback

### 분석 페이지 (`/analytics`)
- [ ] Agency / Industry / Region 탭에 바 차트 표시
- [ ] `DataQualityBadge`가 "real" / "partial" / "insufficient" 중 하나로 표시
- [ ] 데이터가 없으면 `AnalysisNotReady` 빈 상태 컴포넌트 표시
- [ ] 하단에 `IngestionStatusCard` 표시 (수집 상태 + 마지막 재계산 시간)
- [ ] 수집 오류 발생 시 글로벌 `IngestionStatusBanner`(앰버 색) 표시

### 내 기업 프로필 (`/settings/company`)
- [ ] AI 점수 산정 기준 설명 패널이 저장 버튼 위에 표시됨
- [ ] 실데이터 기반 항목은 "실데이터" 배지, 사용자 입력값은 "설정값" 배지

---

## 7단계 — 데이터 커버리지 감사

```sql
SELECT audit_data_coverage();
```

반환값 예시:
```json
{
  "tenders_total": 12000,
  "tenders_with_base_amount": 8500,
  "awards_with_participants": 5200,
  "agency_analysis_count": 420,
  "coverage_pct": 0.71
}
```
`coverage_pct` 가 **0.5 이상**이면 분석 기능이 유의미한 수준으로 동작합니다.

---

## 8단계 — 모니터링

- Vercel Cron Jobs 대시보드에서 각 Job의 성공/실패 확인
- `GET /api/dashboard/ingestion-status` 응답의 `system_ok` 필드가 `true`인지 확인
- `agency_analysis` / `industry_analysis` / `region_analysis` 테이블의 `updated_at` 이 매일 갱신되는지 확인

---

## 변경 파일 목록

### 신규 생성
| 파일 | 설명 |
|---|---|
| `supabase/migrations/026_ai_decision_platform.sql` | DB 스키마 확장 + RPC 함수 9개 |
| `src/lib/bid-intelligence-service.ts` | 서버 서비스 레이어 |
| `src/components/data-quality-badge.tsx` | DataQualityBadge, DataUnavailable, AnalysisNotReady |
| `src/components/ingestion-status.tsx` | IngestionStatusBanner, IngestionStatusCard, LastUpdatedInline |
| `src/app/api/jobs/rebuild-analysis/route.ts` | 분석 캐시 재계산 Cron |
| `src/app/api/jobs/backfill-awards/route.ts` | 과거 낙찰 수동 백필 |
| `src/app/api/dashboard/summary/route.ts` | 대시보드 KPI API |
| `src/app/api/dashboard/ingestion-status/route.ts` | 수집 상태 API |
| `src/app/api/analysis/[type]/route.ts` | 분석 캐시 조회 API |
| `src/app/api/bid-analysis/trending/route.ts` | 실데이터 트렌딩 키워드 API |

### 수정
| 파일 | 주요 변경 내용 |
|---|---|
| `src/app/api/jobs/collect-bid-awards/route.ts` | participant_count, reserve_price 저장 + awards 테이블 연동 |
| `src/hooks/use-api.ts` | AnalysisEntry 타입 + 신규 훅 4개 |
| `src/app/(app)/layout.tsx` | IngestionStatusBanner 추가 |
| `src/app/(app)/page.tsx` | 트렌딩 키워드 실데이터 교체 |
| `src/app/(app)/analytics/page.tsx` | 분석 캐시 차트 + 데이터 품질 배지 |
| `src/app/(app)/settings/company/page.tsx` | AI 점수 설명 패널 |
| `vercel.json` | 수집 빈도 2배 + rebuild-analysis 크론 추가 |
