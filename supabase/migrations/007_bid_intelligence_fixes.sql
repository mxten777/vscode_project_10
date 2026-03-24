-- ============================================================================
-- Migration: 007_bid_intelligence_fixes.sql
-- 1) bid_notices / bid_recommendations → tenders FK 활성화
-- 2) calculate_avg_bid_rate 함수 추가 (collect-bid-awards Job 사용)
-- 3) bid_* 테이블 INSERT/UPDATE RLS 정책 추가 (service_role 명시)
-- ============================================================================

-- ============================================================================
-- 1) FOREIGN KEY 제약조건
-- ============================================================================

-- bid_notices.tender_id → tenders(id)
-- 낙찰 이력은 공고가 삭제돼도 보존 → SET NULL
ALTER TABLE public.bid_notices
  ADD CONSTRAINT fk_bid_notices_tender
  FOREIGN KEY (tender_id)
  REFERENCES public.tenders(id)
  ON DELETE SET NULL;

-- bid_recommendations.tender_id → tenders(id)
-- 추천캐시는 공고 삭제 시 불필요 → CASCADE
ALTER TABLE public.bid_recommendations
  ADD CONSTRAINT fk_bid_recommendations_tender
  FOREIGN KEY (tender_id)
  REFERENCES public.tenders(id)
  ON DELETE CASCADE;

-- ============================================================================
-- 2) calculate_avg_bid_rate 함수
--    collect-bid-awards Job의 calculatePriceFeatures()에서 호출
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_avg_bid_rate(
  filter_type  TEXT,    -- 'agency' | 'industry' | 'region'
  filter_value TEXT,    -- 필터 값 (NULL 이면 전체 평균)
  since_date   TIMESTAMPTZ DEFAULT NOW() - INTERVAL '6 months'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rate NUMERIC;
BEGIN
  IF filter_value IS NULL THEN
    SELECT AVG(ba.winner_bid_rate)
    INTO avg_rate
    FROM bid_awards ba
    WHERE ba.is_final = TRUE
      AND ba.awarded_at >= since_date;

    RETURN avg_rate;
  END IF;

  IF filter_type = 'agency' THEN
    SELECT AVG(ba.winner_bid_rate)
    INTO avg_rate
    FROM bid_awards ba
    INNER JOIN bid_notices bn ON bn.id = ba.bid_notice_id
    WHERE ba.is_final = TRUE
      AND ba.awarded_at >= since_date
      AND bn.demand_organization = filter_value;

  ELSIF filter_type = 'industry' THEN
    SELECT AVG(ba.winner_bid_rate)
    INTO avg_rate
    FROM bid_awards ba
    INNER JOIN bid_notices bn ON bn.id = ba.bid_notice_id
    WHERE ba.is_final = TRUE
      AND ba.awarded_at >= since_date
      AND bn.industry_code = filter_value;

  ELSIF filter_type = 'region' THEN
    SELECT AVG(ba.winner_bid_rate)
    INTO avg_rate
    FROM bid_awards ba
    INNER JOIN bid_notices bn ON bn.id = ba.bid_notice_id
    WHERE ba.is_final = TRUE
      AND ba.awarded_at >= since_date
      AND bn.region_code = filter_value;

  ELSE
    RETURN NULL;
  END IF;

  RETURN avg_rate;
END;
$$;

COMMENT ON FUNCTION calculate_avg_bid_rate IS
  '기관/업종/지역별 평균 낙찰률 계산 — bid_price_features 파생변수 산출용';

-- ============================================================================
-- 3) RLS — 쓰기 정책 (service_role 은 RLS 자체를 우회하나
--    명시적으로 선언해 감사 추적성 확보)
-- ============================================================================

-- bid_notices
CREATE POLICY "bid_notices 서비스롤 쓰기" ON public.bid_notices
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- bid_open_results
CREATE POLICY "bid_open_results 서비스롤 쓰기" ON public.bid_open_results
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- bid_awards
CREATE POLICY "bid_awards 서비스롤 쓰기" ON public.bid_awards
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- bid_price_features
CREATE POLICY "bid_price_features 서비스롤 쓰기" ON public.bid_price_features
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- bid_recommendations
CREATE POLICY "bid_recommendations 서비스롤 쓰기" ON public.bid_recommendations
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
