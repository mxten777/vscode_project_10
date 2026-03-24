-- ============================================================================
-- Migration: 008_bid_price_features_trigger.sql
-- bid_awards INSERT/UPDATE 시 bid_price_features 자동 계산 트리거
-- ============================================================================

-- ============================================================================
-- 트리거 함수: compute_bid_price_features()
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_bid_price_features()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notice            bid_notices%ROWTYPE;
  v_open_result       bid_open_results%ROWTYPE;
  v_price_to_base     NUMERIC;
  v_winner_dev        NUMERIC;
  v_comp_intensity    NUMERIC;
  v_industry_avg_cnt  NUMERIC;
  v_agency_avg_6m     NUMERIC;
  v_industry_avg_6m   NUMERIC;
  v_region_avg_6m     NUMERIC;
  v_industry_avg_3m   NUMERIC;
  v_trend             TEXT;
BEGIN
  -- 1) 공고 기본 정보 조회
  SELECT * INTO v_notice
  FROM bid_notices
  WHERE id = NEW.bid_notice_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 2) 개찰 결과 조회 (없으면 일부 항목 NULL)
  SELECT * INTO v_open_result
  FROM bid_open_results
  WHERE bid_notice_id = NEW.bid_notice_id;

  -- 3) price_to_base_ratio (예정가 / 기초금액)
  IF v_notice.base_amount IS NOT NULL AND v_notice.base_amount <> 0 THEN
    v_price_to_base := ROUND(v_notice.estimated_price / v_notice.base_amount, 4);
  END IF;

  -- 4) winner_rate_deviation (낙찰률 - 해당 건 평균 투찰률)
  IF v_open_result.average_bid_rate IS NOT NULL THEN
    v_winner_dev := ROUND(NEW.winner_bid_rate - v_open_result.average_bid_rate, 4);
  END IF;

  -- 5) competition_intensity (해당 건 참여수 / 업종 6개월 평균 참여수)
  IF v_open_result.total_bidders IS NOT NULL
     AND v_open_result.total_bidders > 0
     AND v_notice.industry_code IS NOT NULL
  THEN
    SELECT COALESCE(AVG(bor.total_bidders), 1)
    INTO v_industry_avg_cnt
    FROM bid_open_results bor
    INNER JOIN bid_notices bn ON bn.id = bor.bid_notice_id
    WHERE bn.industry_code = v_notice.industry_code
      AND bor.opened_at >= NOW() - INTERVAL '6 months';

    IF v_industry_avg_cnt > 0 THEN
      v_comp_intensity := ROUND(v_open_result.total_bidders::NUMERIC / v_industry_avg_cnt, 4);
    END IF;
  END IF;

  -- 6) 시장 파생 변수 (6개월 평균 낙찰률: 기관 / 업종 / 지역)
  v_agency_avg_6m   := calculate_avg_bid_rate('agency',   v_notice.demand_organization, NOW() - INTERVAL '6 months');
  v_industry_avg_6m := calculate_avg_bid_rate('industry', v_notice.industry_code,       NOW() - INTERVAL '6 months');
  v_region_avg_6m   := calculate_avg_bid_rate('region',   v_notice.region_code,         NOW() - INTERVAL '6 months');

  -- 7) 시계열 (3개월 업종 평균)
  v_industry_avg_3m := calculate_avg_bid_rate('industry', v_notice.industry_code, NOW() - INTERVAL '3 months');

  -- 8) 추세 방향: 3개월 업종 평균 vs 6개월 업종 평균 (±0.5% 임계값)
  v_trend := CASE
    WHEN v_industry_avg_3m IS NULL OR v_industry_avg_6m IS NULL THEN 'STABLE'
    WHEN v_industry_avg_3m > v_industry_avg_6m + 0.5              THEN 'UP'
    WHEN v_industry_avg_3m < v_industry_avg_6m - 0.5              THEN 'DOWN'
    ELSE 'STABLE'
  END;

  -- 9) bid_price_features upsert
  INSERT INTO bid_price_features (
    bid_notice_id,
    price_to_base_ratio,
    winner_rate_deviation,
    competition_intensity,
    agency_avg_bid_rate,
    industry_avg_bid_rate,
    region_avg_bid_rate,
    recent_3month_avg_rate,
    recent_6month_avg_rate,
    trend_direction,
    calculated_at,
    updated_at
  ) VALUES (
    NEW.bid_notice_id,
    v_price_to_base,
    v_winner_dev,
    v_comp_intensity,
    v_agency_avg_6m,
    v_industry_avg_6m,
    v_region_avg_6m,
    v_industry_avg_3m,
    v_industry_avg_6m,
    v_trend,
    NOW(),
    NOW()
  )
  ON CONFLICT (bid_notice_id) DO UPDATE SET
    price_to_base_ratio    = EXCLUDED.price_to_base_ratio,
    winner_rate_deviation  = EXCLUDED.winner_rate_deviation,
    competition_intensity  = EXCLUDED.competition_intensity,
    agency_avg_bid_rate    = EXCLUDED.agency_avg_bid_rate,
    industry_avg_bid_rate  = EXCLUDED.industry_avg_bid_rate,
    region_avg_bid_rate    = EXCLUDED.region_avg_bid_rate,
    recent_3month_avg_rate = EXCLUDED.recent_3month_avg_rate,
    recent_6month_avg_rate = EXCLUDED.recent_6month_avg_rate,
    trend_direction        = EXCLUDED.trend_direction,
    calculated_at          = NOW(),
    updated_at             = NOW();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compute_bid_price_features IS
  'bid_awards INSERT/UPDATE 후 bid_price_features 파생변수 자동 계산';

-- ============================================================================
-- 트리거 등록
-- ============================================================================

-- 기존 트리거가 있으면 교체
DROP TRIGGER IF EXISTS trg_bid_awards_compute_features ON bid_awards;

CREATE TRIGGER trg_bid_awards_compute_features
  AFTER INSERT OR UPDATE OF winner_bid_rate, winner_bid_amount, is_final
  ON bid_awards
  FOR EACH ROW
  WHEN (NEW.is_final = TRUE)
  EXECUTE FUNCTION compute_bid_price_features();

COMMENT ON TRIGGER trg_bid_awards_compute_features ON bid_awards IS
  '낙찰 확정(is_final=TRUE) 시 bid_price_features 자동 갱신';
