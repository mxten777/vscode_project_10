-- ============================================================================
-- Migration: 010_bid_stats_rpc.sql
-- 낙찰 통계 대시보드 집계를 DB 함수로 이관
-- 목적: bid_analysis/stats API에서 Node.js 집계 제거 → DB 처리
-- ============================================================================

CREATE OR REPLACE FUNCTION get_bid_stats(
  filter_type  TEXT    DEFAULT 'overall',   -- 'overall' | 'agency' | 'industry' | 'region'
  filter_value TEXT    DEFAULT NULL,
  months_back  INT     DEFAULT 6,
  top_n        INT     DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  since_ts     TIMESTAMPTZ := NOW() - (months_back || ' months')::INTERVAL;
  result       JSONB;
  kpi          JSONB;
  trend        JSONB;
  top_agencies JSONB;
  top_industries JSONB;
  top_regions  JSONB;
BEGIN
  -- ── KPI 집계 ────────────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'total_bids',      COUNT(*),
    'avg_bid_rate',    ROUND(AVG(ba.winner_bid_rate)::numeric, 2),
    'total_amount',    SUM(ba.winner_bid_amount),
    'active_agencies', COUNT(DISTINCT bn.demand_organization),
    'bid_rate', jsonb_build_object(
      'min',    ROUND(MIN(ba.winner_bid_rate)::numeric, 2),
      'max',    ROUND(MAX(ba.winner_bid_rate)::numeric, 2),
      'mean',   ROUND(AVG(ba.winner_bid_rate)::numeric, 2),
      'median', ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ba.winner_bid_rate)::numeric, 2),
      'p25',    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ba.winner_bid_rate)::numeric, 2),
      'p75',    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ba.winner_bid_rate)::numeric, 2),
      'stddev', ROUND(STDDEV(ba.winner_bid_rate)::numeric, 2)
    )
  ) INTO kpi
  FROM bid_awards ba
  INNER JOIN bid_notices bn ON bn.id = ba.bid_notice_id
  WHERE ba.is_final = TRUE
    AND ba.awarded_at >= since_ts
    AND CASE
      WHEN filter_type = 'agency'   AND filter_value IS NOT NULL THEN bn.demand_organization = filter_value
      WHEN filter_type = 'industry' AND filter_value IS NOT NULL THEN bn.industry_code = filter_value
      WHEN filter_type = 'region'   AND filter_value IS NOT NULL THEN bn.region_code = filter_value
      ELSE TRUE
    END;

  -- ── 월별 트렌드 ─────────────────────────────────────────────────────────
  SELECT jsonb_agg(row_data ORDER BY row_data->>'month') INTO trend
  FROM (
    SELECT jsonb_build_object(
      'month',         TO_CHAR(DATE_TRUNC('month', bn.open_datetime), 'IYYY-MM'),
      'count',         COUNT(*),
      'total_amount',  SUM(ba.winner_bid_amount),
      'avg_bid_rate',  ROUND(AVG(ba.winner_bid_rate)::numeric, 2)
    ) AS row_data
    FROM bid_awards ba
    INNER JOIN bid_notices bn ON bn.id = ba.bid_notice_id
    WHERE ba.is_final = TRUE
      AND ba.awarded_at >= since_ts
      AND CASE
        WHEN filter_type = 'agency'   AND filter_value IS NOT NULL THEN bn.demand_organization = filter_value
        WHEN filter_type = 'industry' AND filter_value IS NOT NULL THEN bn.industry_code = filter_value
        WHEN filter_type = 'region'   AND filter_value IS NOT NULL THEN bn.region_code = filter_value
        ELSE TRUE
      END
    GROUP BY DATE_TRUNC('month', bn.open_datetime)
  ) sub;

  -- ── TOP N 기관 ───────────────────────────────────────────────────────────
  SELECT jsonb_agg(row_data) INTO top_agencies
  FROM (
    SELECT jsonb_build_object(
      'name',          bn.demand_organization,
      'count',         COUNT(*),
      'total_amount',  SUM(ba.winner_bid_amount),
      'avg_bid_rate',  ROUND(AVG(ba.winner_bid_rate)::numeric, 2)
    ) AS row_data
    FROM bid_awards ba
    INNER JOIN bid_notices bn ON bn.id = ba.bid_notice_id
    WHERE ba.is_final = TRUE AND ba.awarded_at >= since_ts
    GROUP BY bn.demand_organization
    ORDER BY COUNT(*) DESC
    LIMIT top_n
  ) sub;

  -- ── TOP N 업종 ───────────────────────────────────────────────────────────
  SELECT jsonb_agg(row_data) INTO top_industries
  FROM (
    SELECT jsonb_build_object(
      'name',          COALESCE(bn.industry_name, bn.industry_code, 'Unknown'),
      'count',         COUNT(*),
      'total_amount',  SUM(ba.winner_bid_amount),
      'avg_bid_rate',  ROUND(AVG(ba.winner_bid_rate)::numeric, 2)
    ) AS row_data
    FROM bid_awards ba
    INNER JOIN bid_notices bn ON bn.id = ba.bid_notice_id
    WHERE ba.is_final = TRUE AND ba.awarded_at >= since_ts
    GROUP BY bn.industry_name, bn.industry_code
    ORDER BY COUNT(*) DESC
    LIMIT top_n
  ) sub;

  -- ── TOP N 지역 ───────────────────────────────────────────────────────────
  SELECT jsonb_agg(row_data) INTO top_regions
  FROM (
    SELECT jsonb_build_object(
      'name',          COALESCE(bn.region_name, bn.region_code, 'Unknown'),
      'count',         COUNT(*),
      'total_amount',  SUM(ba.winner_bid_amount),
      'avg_bid_rate',  ROUND(AVG(ba.winner_bid_rate)::numeric, 2)
    ) AS row_data
    FROM bid_awards ba
    INNER JOIN bid_notices bn ON bn.id = ba.bid_notice_id
    WHERE ba.is_final = TRUE AND ba.awarded_at >= since_ts
    GROUP BY bn.region_name, bn.region_code
    ORDER BY COUNT(*) DESC
    LIMIT top_n
  ) sub;

  -- ── 결과 조합 ─────────────────────────────────────────────────────────────
  result := jsonb_build_object(
    'total_bids',      kpi->'total_bids',
    'avg_bid_rate',    kpi->'avg_bid_rate',
    'total_amount',    kpi->'total_amount',
    'active_agencies', kpi->'active_agencies',
    'stats',           jsonb_build_object('bid_rate', kpi->'bid_rate'),
    'trend',           COALESCE(trend, '[]'::jsonb),
    'top_agencies',    COALESCE(top_agencies, '[]'::jsonb),
    'top_industries',  COALESCE(top_industries, '[]'::jsonb),
    'top_regions',     COALESCE(top_regions, '[]'::jsonb)
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_bid_stats IS
  '낙찰 통계 대시보드 집계: KPI + 월별 트렌드 + Top N 기관/업종/지역';
