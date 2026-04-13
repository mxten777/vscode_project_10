-- ============================================================================
-- Migration 023: get_ai_insights_v2 버그 수정
-- 문제: plpgsql에서 CTE는 선언된 SQL 문에서만 유효한데,
--       Round 2/3/4 SELECT문이 별도 문장에서 scored_with_scores를 재참조 → 오류
-- 해결: 모든 스코어링 + 카테고리 분류를 하나의 WITH 체인으로 통합
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ai_insights_v2(
  p_limit           INT     DEFAULT 8,
  p_user_id         UUID    DEFAULT NULL,
  p_industry_codes  TEXT[]  DEFAULT NULL,
  p_region_codes    TEXT[]  DEFAULT NULL,
  p_agency_names    TEXT[]  DEFAULT NULL,
  p_min_budget      NUMERIC DEFAULT NULL,
  p_max_budget      NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rates           JSONB;
  industry_rates  JSONB;
  agency_rates    JSONB;
  region_rates    JSONB;
  competition_avg JSONB;
  coverage        JSONB;
  result          JSONB;
BEGIN
  -- ① 집계 데이터 로드 (별도 함수 호출은 문장 경계 밖에서 OK)
  rates           := get_win_rates();
  industry_rates  := rates -> 'industry';
  agency_rates    := rates -> 'agency';
  region_rates    := rates -> 'region';
  competition_avg := rates -> 'competition';
  coverage        := rates -> 'coverage';

  -- ② 스코어링·카테고리 분류·JSON 조합을 단일 SQL 문으로 처리
  WITH
  scored AS (
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
      (industry_rates  ->> t.industry_code)::numeric               AS ind_avg_rate,
      (agency_rates    ->> t.demand_agency_name)::numeric          AS agn_avg_rate,
      (region_rates    ->> t.region_code)::numeric                 AS rgn_avg_rate,
      (competition_avg ->> COALESCE(t.industry_code,''))::numeric  AS avg_bidders_raw,
      (industry_rates  ?  COALESCE(t.industry_code,''))            AS has_ind,
      (agency_rates    ?  COALESCE(t.demand_agency_name,''))       AS has_agn,
      (competition_avg ?  COALESCE(t.industry_code,''))            AS has_comp,
      (p_industry_codes IS NOT NULL AND t.industry_code      = ANY(p_industry_codes)) AS pref_industry,
      (p_region_codes   IS NOT NULL AND t.region_code        = ANY(p_region_codes))   AS pref_region,
      (p_agency_names   IS NOT NULL AND t.demand_agency_name = ANY(p_agency_names))   AS pref_agency,
      (p_min_budget IS NOT NULL AND p_max_budget IS NOT NULL
        AND t.budget_amount BETWEEN p_min_budget AND p_max_budget)                    AS budget_fit
    FROM tenders t
    WHERE t.status = 'OPEN' AND t.deadline_at > NOW()
  ),
  scored_full AS (
    SELECT s.*,
      COALESCE(LEAST(100, GREATEST(0, ((s.ind_avg_rate - 85.0) / 15.0 * 100)::numeric)), 50)::numeric AS ind_score,
      COALESCE(LEAST(100, GREATEST(0, ((s.agn_avg_rate - 85.0) / 15.0 * 100)::numeric)), 50)::numeric AS agn_score,
      COALESCE(LEAST(100, GREATEST(0, ((s.rgn_avg_rate - 85.0) / 15.0 * 100)::numeric)), 50)::numeric AS rgn_score,
      GREATEST(0, 100 - COALESCE(s.avg_bidders_raw, 10) * 5)::numeric                               AS comp_score,
      CASE
        WHEN s.budget_amount IS NULL THEN 50
        WHEN p_min_budget IS NOT NULL AND p_max_budget IS NOT NULL
          AND s.budget_amount BETWEEN p_min_budget AND p_max_budget THEN 90
        WHEN s.budget_amount BETWEEN 50000000 AND 5000000000 THEN 75
        WHEN s.budget_amount < 50000000 THEN 55
        ELSE 40
      END::numeric AS budget_score,
      CASE
        WHEN s.deadline_at IS NULL THEN 50
        WHEN s.deadline_at < NOW() + INTERVAL '3 days'  THEN 25
        WHEN s.deadline_at < NOW() + INTERVAL '7 days'  THEN 55
        WHEN s.deadline_at < NOW() + INTERVAL '30 days' THEN 90
        ELSE 70
      END::numeric AS urgency_score,
      CASE
        WHEN p_industry_codes IS NULL THEN 50
        WHEN s.pref_industry AND s.pref_region AND s.pref_agency THEN 100
        WHEN s.pref_industry AND (s.pref_region OR s.pref_agency) THEN 85
        WHEN s.pref_industry THEN 70
        WHEN s.pref_region OR s.pref_agency THEN 60
        ELSE 30
      END::numeric AS profile_score,
      CASE
        WHEN (industry_rates ? COALESCE(s.industry_code,''))
          AND (agency_rates  ? COALESCE(s.demand_agency_name,''))
          AND (competition_avg ? COALESCE(s.industry_code,'')) THEN 'real'
        WHEN (industry_rates ? COALESCE(s.industry_code,''))
          OR  (agency_rates  ? COALESCE(s.demand_agency_name,'')) THEN 'partial'
        ELSE 'insufficient'
      END AS data_quality
    FROM scored s
  ),
  sws AS (
    -- scored_with_scores: 최종 점수 + 추천 이유
    SELECT sf.*,
      ROUND(
        sf.ind_score*0.30 + sf.agn_score*0.25 + sf.rgn_score*0.15 +
        sf.budget_score*0.10 + sf.comp_score*0.10 + sf.urgency_score*0.05 + sf.profile_score*0.05,
        2
      )::numeric AS win_probability,
      ROUND(
        LEAST(100, COALESCE(sf.budget_amount,0) / 1000000000.0 * 40) * 0.40 +
        ROUND(
          sf.ind_score*0.30 + sf.agn_score*0.25 + sf.rgn_score*0.15 +
          sf.budget_score*0.10 + sf.comp_score*0.10 + sf.urgency_score*0.05 + sf.profile_score*0.05,
          2
        ) * 0.35 +
        sf.comp_score * 0.15 + sf.agn_score * 0.10,
        2
      )::numeric AS profitability_score,
      CASE
        WHEN sf.pref_industry AND sf.pref_agency THEN '선호 업종 · 기관과 일치하며 AI 종합 점수가 높습니다'
        WHEN sf.pref_industry                    THEN '선호 업종과 일치하는 공고입니다'
        WHEN sf.comp_score >= 70 AND sf.has_comp THEN '동종 업계 평균 경쟁 업체 수가 적습니다'
        WHEN sf.agn_score  >= 70 AND sf.has_agn  THEN '이 기관의 평균 낙찰률이 상대적으로 높습니다'
        WHEN sf.ind_score  >= 70 AND sf.has_ind  THEN '이 업종의 낙찰 패턴이 유리합니다'
        WHEN sf.urgency_score >= 85              THEN '마감까지 준비 시간이 충분합니다'
        WHEN sf.budget_fit                       THEN '귀사 목표 예산 범위와 일치합니다'
        WHEN sf.data_quality = 'insufficient'    THEN '관련 분석 데이터가 아직 충분하지 않습니다'
        ELSE '종합 점수 기준 상위 추천 공고입니다'
      END AS reason
    FROM scored_full sf
  ),
  -- ── Round 1: 종합 추천 ─────────────────────────────────────────────────────
  cat1 AS (
    SELECT id FROM (
      SELECT id,
        ROW_NUMBER() OVER (
          ORDER BY (win_probability*0.45 + profitability_score*0.20 + comp_score*0.15 + profile_score*0.20) DESC NULLS LAST
        ) AS rn
      FROM sws
    ) sub WHERE rn <= p_limit
  ),
  -- ── Round 2: 낙찰 가능성 높음 (cat1 제외) ─────────────────────────────────
  cat2 AS (
    SELECT id FROM (
      SELECT id,
        ROW_NUMBER() OVER (ORDER BY win_probability DESC NULLS LAST) AS rn
      FROM sws
      WHERE win_probability >= 60
        AND id NOT IN (SELECT id FROM cat1)
    ) sub WHERE rn <= p_limit
  ),
  -- ── Round 3: 경쟁 적음 (cat1+cat2 제외) ───────────────────────────────────
  cat3 AS (
    SELECT id FROM (
      SELECT id,
        ROW_NUMBER() OVER (
          ORDER BY avg_bidders_raw ASC NULLS LAST, budget_amount DESC NULLS LAST
        ) AS rn
      FROM sws
      WHERE id NOT IN (SELECT id FROM cat1)
        AND id NOT IN (SELECT id FROM cat2)
    ) sub WHERE rn <= p_limit
  ),
  -- ── Round 4: 수익성 높음 (cat1+cat2+cat3 제외) ────────────────────────────
  cat4 AS (
    SELECT id FROM (
      SELECT id,
        ROW_NUMBER() OVER (ORDER BY profitability_score DESC NULLS LAST) AS rn
      FROM sws
      WHERE budget_amount IS NOT NULL
        AND id NOT IN (SELECT id FROM cat1)
        AND id NOT IN (SELECT id FROM cat2)
        AND id NOT IN (SELECT id FROM cat3)
    ) sub WHERE rn <= p_limit
  )
  -- ── 최종 JSON 조합 ─────────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'recommended',
    COALESCE((
      SELECT jsonb_agg(row_to_json(r)
        ORDER BY (r.win_probability*0.45 + r.profitability_score*0.20 + r.comp_score*0.15 + r.profile_score*0.20) DESC
      )
      FROM (
        SELECT s.id, s.source_tender_id, s.title,
               s.industry_code, s.industry_name, s.region_code, s.region_name,
               s.demand_agency_name, s.budget_amount, s.deadline_at,
               s.ind_avg_rate, s.agn_avg_rate, s.avg_bidders_raw AS avg_bidders,
               s.comp_score, s.profile_score, s.win_probability, s.profitability_score,
               ROUND((s.win_probability*0.45 + s.profitability_score*0.20 + s.comp_score*0.15 + s.profile_score*0.20)::numeric,2) AS total_score,
               s.reason, s.data_quality
        FROM sws s WHERE s.id IN (SELECT id FROM cat1)
      ) r
    ), '[]'::jsonb),

    'high_probability',
    COALESCE((
      SELECT jsonb_agg(row_to_json(r) ORDER BY r.win_probability DESC)
      FROM (
        SELECT s.id, s.source_tender_id, s.title,
               s.industry_code, s.industry_name, s.region_code, s.region_name,
               s.demand_agency_name, s.budget_amount, s.deadline_at,
               s.ind_avg_rate, s.agn_avg_rate, s.avg_bidders_raw AS avg_bidders,
               s.comp_score, s.profile_score, s.win_probability,
               s.win_probability AS total_score,
               s.reason, s.data_quality
        FROM sws s WHERE s.id IN (SELECT id FROM cat2)
      ) r
    ), '[]'::jsonb),

    'low_competition',
    COALESCE((
      SELECT jsonb_agg(row_to_json(r) ORDER BY r.avg_bidders ASC NULLS LAST)
      FROM (
        SELECT s.id, s.source_tender_id, s.title,
               s.industry_code, s.industry_name, s.region_code, s.region_name,
               s.demand_agency_name, s.budget_amount, s.deadline_at,
               s.ind_avg_rate, s.agn_avg_rate, s.avg_bidders_raw AS avg_bidders,
               s.comp_score, s.profile_score, s.win_probability,
               s.comp_score AS total_score,
               CASE
                 WHEN s.has_comp THEN format('평균 경쟁 업체 수 %.1f개 (데이터 기반)', s.avg_bidders_raw)
                 ELSE '경쟁 데이터가 부족한 공고입니다 (기회 가능성)'
               END AS reason,
               s.data_quality
        FROM sws s WHERE s.id IN (SELECT id FROM cat3)
      ) r
    ), '[]'::jsonb),

    'high_profitability',
    COALESCE((
      SELECT jsonb_agg(row_to_json(r) ORDER BY r.total_score DESC)
      FROM (
        SELECT s.id, s.source_tender_id, s.title,
               s.industry_code, s.industry_name, s.region_code, s.region_name,
               s.demand_agency_name, s.budget_amount, s.deadline_at,
               s.ind_avg_rate, s.agn_avg_rate, s.avg_bidders_raw AS avg_bidders,
               s.comp_score, s.profile_score, s.win_probability,
               s.profitability_score AS total_score,
               CASE
                 WHEN s.budget_amount IS NOT NULL THEN
                   format('예산 %s, 기회 점수 %.0f점',
                     CASE
                       WHEN s.budget_amount >= 1000000000
                         THEN to_char((s.budget_amount / 100000000)::numeric, 'FM999') || '억원'
                       ELSE to_char((s.budget_amount / 10000)::numeric, 'FM999,999') || '만원'
                     END,
                     s.win_probability)
                 ELSE '고예산 공고입니다'
               END AS reason,
               s.data_quality
        FROM sws s WHERE s.id IN (SELECT id FROM cat4)
      ) r
    ), '[]'::jsonb),

    'has_profile',  (p_user_id IS NOT NULL AND p_industry_codes IS NOT NULL),
    'coverage',     coverage,
    'computed_at',  NOW()
  ) INTO result;

  RETURN result;
END;
$$;
