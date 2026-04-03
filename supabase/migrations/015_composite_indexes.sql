-- ================================================================
-- Migration 015: 복합 인덱스 추가 (쿼리 성능 최적화)
-- 목적:
--   tenders 테이블에 자주 사용되는 복합 필터 쿼리 패턴에 맞춰
--   Partial Index(부분 인덱스) 포함 복합 인덱스 추가.
--   기존 단일 컬럼 인덱스(schema.sql)와 중복되지 않도록 설계.
-- ================================================================

-- ── tenders 복합 인덱스 ──────────────────────────────────────

-- [S3-1] status + deadline_at: "OPEN 공고 마감 임박순" 정렬
--   기존 idx_tenders_status(단일), idx_tenders_deadline(단일)으로는
--   복합 조건 쿼리 시 인덱스 순차 스캔 발생 → 복합으로 통합
--   Partial Index: status='OPEN' 조건만 포함 → 인덱스 크기 최소화
CREATE INDEX IF NOT EXISTS idx_tenders_status_deadline
  ON public.tenders (deadline_at ASC NULLS LAST)
  WHERE status = 'OPEN';

-- [S3-2] region_code + industry_code + published_at: 지역/업종 필터 + 최신순
--   입찰 분석 쿼리에서 region_code, industry_code 동시 필터링 빈번
CREATE INDEX IF NOT EXISTS idx_tenders_region_industry_published
  ON public.tenders (region_code, industry_code, published_at DESC NULLS LAST);

-- [S3-3] budget_amount: 예산 범위 필터 (Partial — NOT NULL만)
--   NULL budget_amount는 검색 대상 아님 → Partial로 인덱스 크기 감소
CREATE INDEX IF NOT EXISTS idx_tenders_budget_range
  ON public.tenders (budget_amount)
  WHERE budget_amount IS NOT NULL;

-- [S3-4] agency_id + status: 기관별 진행 공고 조회
CREATE INDEX IF NOT EXISTS idx_tenders_agency_status
  ON public.tenders (agency_id, status)
  WHERE agency_id IS NOT NULL;

-- [S3-5] status + published_at: 전체 상태별 최신순 목록 (대시보드 KPI)
CREATE INDEX IF NOT EXISTS idx_tenders_status_published
  ON public.tenders (status, published_at DESC NULLS LAST);

-- ── bid_awards 복합 인덱스 ──────────────────────────────────

-- 업종 + 지역별 낙찰률 통계 (industry_code/region_code는 bid_notices에 있음)
CREATE INDEX IF NOT EXISTS idx_bid_notices_industry_region
  ON public.bid_notices (industry_code, region_code)
  WHERE industry_code IS NOT NULL;

-- 낙찰일 최신순 (bid_awards의 시계열 컬럼은 awarded_at)
CREATE INDEX IF NOT EXISTS idx_bid_awards_awarded_at
  ON public.bid_awards (awarded_at DESC NULLS LAST)
  WHERE awarded_at IS NOT NULL;

-- ── alert_logs 복합 인덱스 ──────────────────────────────────

-- 규칙별 최근 알림 이력 조회
CREATE INDEX IF NOT EXISTS idx_alert_logs_rule_sent
  ON public.alert_logs (alert_rule_id, sent_at DESC);

-- ── favorites 복합 인덱스 ───────────────────────────────────

-- org + tender: 조직 즐겨찾기 목록
CREATE INDEX IF NOT EXISTS idx_favorites_org_tender
  ON public.favorites (org_id, tender_id);

-- ── bid_notices 복합 인덱스 ─────────────────────────────────

-- 업종 + 개찰일: 유사 공고 검색 핵심 쿼리
CREATE INDEX IF NOT EXISTS idx_bid_notices_industry_open
  ON public.bid_notices (industry_code, open_datetime DESC NULLS LAST)
  WHERE industry_code IS NOT NULL;

-- ================================================================
-- 통계 갱신 (인덱스 효율을 위한 플래너 정보 최신화)
-- ================================================================
ANALYZE public.tenders;
ANALYZE public.bid_awards;
ANALYZE public.alert_logs;
