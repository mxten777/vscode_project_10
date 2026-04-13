-- ============================================================================
-- Migration: 021_ai_insights.sql
-- AI 입찰 의사결정 플랫폼 핵심 기능
-- 1) analysis_cache 테이블
-- 2) get_ai_insights() — 낙찰 가능성·경쟁·수익성 기반 공고 스코어링
-- ============================================================================

-- ── 1. analysis_cache 테이블 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   TEXT        UNIQUE NOT NULL,
  data        JSONB       NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_key ON analysis_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires ON analysis_cache (expires_at);

-- ── 2. get_ai_insights(limit) ────────────────────────────────────────────
-- 낙찰 가능성 = (업종 낙찰률×0.4) + (기관 낙찰률×0.3) + (지역 낙찰률×0.2) + (경쟁강도×0.1)
-- 경쟁강도 = MAX(0, 100 − avg_bidders × 5)  (참여업체가 적을수록 높음)
-- 데이터 없는 차원은 50(중립) 사용
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ai_insights(p_limit INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  industry_rates  JSONB;
  agency_rates    JSONB;
  region_rates    JSONB;
  competition_avg JSONB;

  recommended      JSONB;
  high_probability JSONB;
  low_competition  JSONB;
  high_profitability JSONB;
BEGIN
  -- ① 업종별 낙찰률 (%): bid_notices + bid_awards 역사 데이터
  SELECT COALESCE(jsonb_object_agg(industry_code, win_rate), '{}')
  INTO industry_rates
  FROM (
    SELECT
      bn.industry_code,
      ROUND(COUNT(ba.id)::numeric / NULLIF(COUNT(bn.id), 0) * 100, 2) AS win_rate
    FROM bid_notices bn
    LEFT JOIN bid_awards ba ON ba.bid_notice_id = bn.id AND ba.is_final = TRUE
    WHERE bn.industry_code IS NOT NULL
    GROUP BY bn.industry_code
    HAVING COUNT(bn.id) >= 3
  ) sub;

  -- ② 기관별 낙찰률 (%)
  SELECT COALESCE(jsonb_object_agg(demand_organization, win_rate), '{}')
  INTO agency_rates
  FROM (
    SELECT
      bn.demand_organization,
      ROUND(COUNT(ba.id)::numeric / NULLIF(COUNT(bn.id), 0) * 100, 2) AS win_rate
    FROM bid_notices bn
    LEFT JOIN bid_awards ba ON ba.bid_notice_id = bn.id AND ba.is_final = TRUE
    WHERE bn.demand_organization IS NOT NULL
    GROUP BY bn.demand_organization
    HAVING COUNT(bn.id) >= 3
  ) sub;

  -- ③ 지역별 낙찰률 (%)
  SELECT COALESCE(jsonb_object_agg(region_code, win_rate), '{}')
  INTO region_rates
  FROM (
    SELECT
      bn.region_code,
      ROUND(COUNT(ba.id)::numeric / NULLIF(COUNT(bn.id), 0) * 100, 2) AS win_rate
    FROM bid_notices bn
    LEFT JOIN bid_awards ba ON ba.bid_notice_id = bn.id AND ba.is_final = TRUE
    WHERE bn.region_code IS NOT NULL
    GROUP BY bn.region_code
    HAVING COUNT(bn.id) >= 3
  ) sub;

  -- ④ 업종별 평균 참여업체 수 (경쟁강도 기반)
  SELECT COALESCE(jsonb_object_agg(industry_code, avg_bidders), '{}')
  INTO competition_avg
  FROM (
    SELECT
      bn.industry_code,
      ROUND(AVG(bor.total_bidders), 1) AS avg_bidders
    FROM bid_notices bn
    JOIN bid_open_results bor ON bor.bid_notice_id = bn.id
    WHERE bn.industry_code IS NOT NULL
    GROUP BY bn.industry_code
    HAVING COUNT(*) >= 3
  ) sub;

  -- ⑤ 현재 OPEN 공고 스코어링
  --    (analysis_cache에 유효한 캐시가 없을 때만 계산 — 이 함수 자체를 캐시로 감쌀 수 있음)
  WITH scored AS (
    SELECT
      t.id,
      t.source_tender_id,
      t.title,
      t.industry_code,
      t.industry_name,
      t.region_code,
      t.region_name,
      t.demand_agency_name,
      t.budget_amount,
      t.deadline_at,
      t.published_at,
      t.status,
      -- 개별 차원 점수 (데이터 없으면 50 중립)
      COALESCE((industry_rates ->> t.industry_code)::numeric, 50)         AS ind_rate,
      COALESCE((agency_rates   ->> t.demand_agency_name)::numeric, 50)    AS agn_rate,
      COALESCE((region_rates   ->> t.region_code)::numeric, 50)           AS rgn_rate,
      COALESCE((competition_avg ->> t.industry_code)::numeric, 10)        AS avg_bidders,
      -- 낙찰 가능성 점수 (0~100)
      ROUND(
        COALESCE((industry_rates ->> t.industry_code)::numeric, 50) * 0.4 +
        COALESCE((agency_rates   ->> t.demand_agency_name)::numeric, 50) * 0.3 +
        COALESCE((region_rates   ->> t.region_code)::numeric, 50) * 0.2 +
        GREATEST(0::numeric,
          100::numeric - COALESCE((competition_avg ->> t.industry_code)::numeric, 10) * 5
        ) * 0.1,
        2
      ) AS win_probability
    FROM tenders t
    WHERE t.status = 'OPEN'
      AND t.deadline_at > NOW()
  )

  -- 추천 (win_probability 내림차순)
  , ranked_recommended AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY win_probability DESC) AS rn FROM scored
  )
  -- 낙찰 가능성 높은 공고 (>= 65)
  , ranked_high AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY win_probability DESC) AS rn
    FROM scored WHERE win_probability >= 65
  )
  -- 경쟁 적은 공고 (avg_bidders ASC)
  , ranked_low_comp AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY avg_bidders ASC, budget_amount DESC NULLS LAST) AS rn FROM scored
  )
  -- 수익성 높은 공고 (budget × win_probability DESC)
  , ranked_profit AS (
    SELECT *,
      ROW_NUMBER() OVER (
        ORDER BY (COALESCE(budget_amount,0) * win_probability) DESC
      ) AS rn
    FROM scored WHERE budget_amount IS NOT NULL
  )

  SELECT
    jsonb_build_object(
      'recommended',
        (SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'source_tender_id', source_tender_id,
          'title', title, 'industry_code', industry_code, 'industry_name', industry_name,
          'region_code', region_code, 'region_name', region_name,
          'demand_agency_name', demand_agency_name,
          'budget_amount', budget_amount, 'deadline_at', deadline_at,
          'ind_rate', ind_rate, 'agn_rate', agn_rate, 'rgn_rate', rgn_rate,
          'avg_bidders', avg_bidders, 'win_probability', win_probability
        )) FROM ranked_recommended WHERE rn <= p_limit),

      'high_probability',
        (SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'source_tender_id', source_tender_id,
          'title', title, 'industry_code', industry_code, 'industry_name', industry_name,
          'region_code', region_code, 'region_name', region_name,
          'demand_agency_name', demand_agency_name,
          'budget_amount', budget_amount, 'deadline_at', deadline_at,
          'ind_rate', ind_rate, 'agn_rate', agn_rate, 'rgn_rate', rgn_rate,
          'avg_bidders', avg_bidders, 'win_probability', win_probability
        )) FROM ranked_high WHERE rn <= p_limit),

      'low_competition',
        (SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'source_tender_id', source_tender_id,
          'title', title, 'industry_code', industry_code, 'industry_name', industry_name,
          'region_code', region_code, 'region_name', region_name,
          'demand_agency_name', demand_agency_name,
          'budget_amount', budget_amount, 'deadline_at', deadline_at,
          'ind_rate', ind_rate, 'agn_rate', agn_rate, 'rgn_rate', rgn_rate,
          'avg_bidders', avg_bidders, 'win_probability', win_probability
        )) FROM ranked_low_comp WHERE rn <= p_limit),

      'high_profitability',
        (SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'source_tender_id', source_tender_id,
          'title', title, 'industry_code', industry_code, 'industry_name', industry_name,
          'region_code', region_code, 'region_name', region_name,
          'demand_agency_name', demand_agency_name,
          'budget_amount', budget_amount, 'deadline_at', deadline_at,
          'ind_rate', ind_rate, 'agn_rate', agn_rate, 'rgn_rate', rgn_rate,
          'avg_bidders', avg_bidders, 'win_probability', win_probability
        )) FROM ranked_profit WHERE rn <= p_limit),

      'computed_at', NOW()
    )
  INTO recommended;   -- 변수 재활용 (result 담기)

  RETURN COALESCE(recommended, '{}'::jsonb);
END;
$$;

-- ── 3. upsert_analysis_cache() — 캐시 저장 helper ────────────────────────
CREATE OR REPLACE FUNCTION upsert_analysis_cache(
  p_key  TEXT,
  p_data JSONB,
  p_ttl  INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO analysis_cache (cache_key, data, computed_at, expires_at)
  VALUES (p_key, p_data, NOW(), NOW() + p_ttl)
  ON CONFLICT (cache_key) DO UPDATE
    SET data        = EXCLUDED.data,
        computed_at = EXCLUDED.computed_at,
        expires_at  = EXCLUDED.expires_at;
$$;
