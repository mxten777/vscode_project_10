-- ============================================================================
-- Migration 022: AI 입찰 의사결정 플랫폼 전면 개선
-- 변경사항:
--   1) company_profiles      — 사용자 회사 프로파일 (개인화 추천용)
--   2) recommendation_logs   — 추천 이력
--   3) get_win_rates()       — 실제 tenders+awards 기반 낙찰률 집계
--   4) get_ai_insights_v2()  — 중복 제거, 추천 이유, 데이터 품질 표기
--   5) refresh_analysis_cache() — 분석 캐시 갱신 helper
-- ============================================================================

-- ── 1. company_profiles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id                UUID        REFERENCES public.orgs(id) ON DELETE SET NULL,
  company_name          TEXT,
  industry_codes        TEXT[]      DEFAULT '{}',   -- 주력 업종코드 목록
  region_codes          TEXT[]      DEFAULT '{}',   -- 활동 지역코드 목록
  preferred_agency_names TEXT[]     DEFAULT '{}',   -- 선호 발주기관명
  min_budget            NUMERIC,                    -- 최소 목표 예산
  max_budget            NUMERIC,                    -- 최대 목표 예산
  keywords              TEXT[]      DEFAULT '{}',   -- 관심 키워드
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_org  ON company_profiles (org_id);

-- RLS
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_profiles_own"
  ON public.company_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- updated_at 트리거
CREATE TRIGGER set_company_profiles_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. recommendation_logs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recommendation_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  tender_id           UUID        REFERENCES public.tenders(id) ON DELETE CASCADE,
  recommendation_type TEXT        NOT NULL
    CHECK (recommendation_type IN ('recommended','high_probability','low_competition','high_profitability')),
  total_score         NUMERIC(6,2),
  reason_text         TEXT,
  data_quality        TEXT        NOT NULL DEFAULT 'insufficient'
    CHECK (data_quality IN ('real','partial','insufficient')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_logs_user   ON recommendation_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rec_logs_tender ON recommendation_logs (tender_id);

ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rec_logs_own"
  ON public.recommendation_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── 3. get_win_rates() — 실제 tenders + awards 기반 집계 ────────────────────
-- 반환: { industry: {code: avg_rate}, agency: {...}, region: {...},
--         competition: {code: avg_bidders},
--         coverage: {awards_count, bor_count, tenders_open_count} }
CREATE OR REPLACE FUNCTION get_win_rates()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  industry_rates  JSONB;
  agency_rates    JSONB;
  region_rates    JSONB;
  competition_avg JSONB;
  coverage        JSONB;
BEGIN
  -- ① 업종별 평균 낙찰률 (tenders + awards — 실제 데이터)
  SELECT COALESCE(jsonb_object_agg(industry_code, avg_rate), '{}')
  INTO industry_rates
  FROM (
    SELECT
      t.industry_code,
      ROUND(AVG(a.awarded_rate)::numeric, 2)  AS avg_rate,
      COUNT(*) AS cnt
    FROM tenders t
    JOIN awards a ON a.tender_id = t.id
    WHERE t.industry_code IS NOT NULL
      AND a.awarded_rate IS NOT NULL
    GROUP BY t.industry_code
    HAVING COUNT(*) >= 3
  ) sub;

  -- ② 기관별 평균 낙찰률
  SELECT COALESCE(jsonb_object_agg(demand_agency_name, avg_rate), '{}')
  INTO agency_rates
  FROM (
    SELECT
      t.demand_agency_name,
      ROUND(AVG(a.awarded_rate)::numeric, 2) AS avg_rate
    FROM tenders t
    JOIN awards a ON a.tender_id = t.id
    WHERE t.demand_agency_name IS NOT NULL
      AND a.awarded_rate IS NOT NULL
    GROUP BY t.demand_agency_name
    HAVING COUNT(*) >= 3
  ) sub;

  -- ③ 지역별 평균 낙찰률
  SELECT COALESCE(jsonb_object_agg(region_code, avg_rate), '{}')
  INTO region_rates
  FROM (
    SELECT
      t.region_code,
      ROUND(AVG(a.awarded_rate)::numeric, 2) AS avg_rate
    FROM tenders t
    JOIN awards a ON a.tender_id = t.id
    WHERE t.region_code IS NOT NULL
      AND a.awarded_rate IS NOT NULL
    GROUP BY t.region_code
    HAVING COUNT(*) >= 5
  ) sub;

  -- ④ 업종별 평균 경쟁업체 수 (bid_open_results 상세 데이터)
  SELECT COALESCE(jsonb_object_agg(industry_code, avg_bidders), '{}')
  INTO competition_avg
  FROM (
    SELECT
      bn.industry_code,
      ROUND(AVG(bor.total_bidders)::numeric, 1) AS avg_bidders
    FROM bid_notices bn
    JOIN bid_open_results bor ON bor.bid_notice_id = bn.id
    WHERE bn.industry_code IS NOT NULL
      AND bor.total_bidders > 0
    GROUP BY bn.industry_code
    HAVING COUNT(*) >= 3
  ) sub;

  -- ⑤ 데이터 커버리지
  SELECT jsonb_build_object(
    'awards_count',        (SELECT COUNT(*) FROM awards WHERE awarded_rate IS NOT NULL),
    'bor_count',           (SELECT COUNT(*) FROM bid_open_results),
    'tenders_open_count',  (SELECT COUNT(*) FROM tenders WHERE status = 'OPEN' AND deadline_at > NOW()),
    'industry_dimensions', jsonb_array_length(COALESCE(jsonb_agg(k), '[]'::jsonb))
  ) INTO coverage
  FROM jsonb_object_keys(industry_rates) k;

  RETURN jsonb_build_object(
    'industry',    industry_rates,
    'agency',      agency_rates,
    'region',      region_rates,
    'competition', competition_avg,
    'coverage',    coverage
  );
END;
$$;

-- ── 4. get_ai_insights_v2() — 중복 제거 + 추천 이유 + 데이터 품질 ───────────
-- p_limit     : 카테고리당 반환 수
-- p_user_id   : 개인화 (NULL이면 일반 모드)
-- p_industry_codes : 선호 업종 배열
-- p_region_codes   : 선호 지역 배열
-- p_agency_names   : 선호 기관 배열
-- p_min_budget / p_max_budget : 목표 예산 범위
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

  recommended_ids       UUID[] := '{}';
  high_prob_ids         UUID[] := '{}';
  low_comp_ids          UUID[] := '{}';

  recommended_data      JSONB;
  high_prob_data        JSONB;
  low_comp_data         JSONB;
  profit_data           JSONB;
BEGIN
  -- ① 집계 데이터 로드
  rates := get_win_rates();
  industry_rates  := rates -> 'industry';
  agency_rates    := rates -> 'agency';
  region_rates    := rates -> 'region';
  competition_avg := rates -> 'competition';
  coverage        := rates -> 'coverage';

  -- ② OPEN 공고 스코어링 (shared CTE across all 4 categories)
  -- ─── Round 1: AI 추천 (최종 종합 점수 상위) ──────────────────────────────
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

      -- 원시 낙찰률 (없으면 NULL)
      (industry_rates ->> t.industry_code)::numeric                   AS ind_avg_rate,
      (agency_rates   ->> t.demand_agency_name)::numeric              AS agn_avg_rate,
      (region_rates   ->> t.region_code)::numeric                     AS rgn_avg_rate,
      (competition_avg ->> COALESCE(t.industry_code,''))::numeric     AS avg_bidders_raw,

      -- 데이터 유무 플래그
      (industry_rates  ? COALESCE(t.industry_code,''))   AS has_ind,
      (agency_rates    ? COALESCE(t.demand_agency_name,'')) AS has_agn,
      (competition_avg ? COALESCE(t.industry_code,''))   AS has_comp,

      -- 개인화 플래그 (프로파일이 있을 때만 의미 있음)
      (p_industry_codes IS NOT NULL
        AND t.industry_code = ANY(p_industry_codes))                  AS pref_industry,
      (p_region_codes IS NOT NULL
        AND t.region_code = ANY(p_region_codes))                      AS pref_region,
      (p_agency_names IS NOT NULL
        AND t.demand_agency_name = ANY(p_agency_names))               AS pref_agency,
      (p_min_budget IS NOT NULL AND p_max_budget IS NOT NULL
        AND t.budget_amount BETWEEN p_min_budget AND p_max_budget)    AS budget_fit
    FROM tenders t
    WHERE t.status = 'OPEN'
      AND t.deadline_at > NOW()
  ),
  scored_full AS (
    SELECT
      s.*,
      -- 업종 점수: 낙찰률 정규화 (85%~100% → 0~100pt, 없으면 50)
      COALESCE(
        LEAST(100, GREATEST(0,
          ((s.ind_avg_rate - 85.0) / 15.0 * 100)::numeric
        )), 50
      )::numeric                                        AS ind_score,

      -- 기관 점수
      COALESCE(
        LEAST(100, GREATEST(0,
          ((s.agn_avg_rate - 85.0) / 15.0 * 100)::numeric
        )), 50
      )::numeric                                        AS agn_score,

      -- 지역 점수
      COALESCE(
        LEAST(100, GREATEST(0,
          ((s.rgn_avg_rate - 85.0) / 15.0 * 100)::numeric
        )), 50
      )::numeric                                        AS rgn_score,

      -- 경쟁 강도: MAX(0, 100 − avg_bidders×5), 없으면 50
      GREATEST(0,
        100 - COALESCE(s.avg_bidders_raw, 10) * 5
      )::numeric                                        AS comp_score,

      -- 예산 적합도
      CASE
        WHEN s.budget_amount IS NULL THEN 50
        WHEN p_min_budget IS NOT NULL AND p_max_budget IS NOT NULL
          AND s.budget_amount BETWEEN p_min_budget AND p_max_budget THEN 90
        WHEN s.budget_amount BETWEEN 50000000 AND 5000000000 THEN 75
        WHEN s.budget_amount < 50000000 THEN 55
        ELSE 40
      END::numeric                                      AS budget_score,

      -- 마감 임박도 (D-7~30이 최적)
      CASE
        WHEN s.deadline_at IS NULL THEN 50
        WHEN s.deadline_at < NOW() + INTERVAL '3 days'  THEN 25
        WHEN s.deadline_at < NOW() + INTERVAL '7 days'  THEN 55
        WHEN s.deadline_at < NOW() + INTERVAL '30 days' THEN 90
        ELSE 70
      END::numeric                                      AS urgency_score,

      -- 개인화 점수 (프로파일 없으면 50 중립)
      CASE
        WHEN p_industry_codes IS NULL THEN 50
        WHEN s.pref_industry AND s.pref_region AND s.pref_agency THEN 100
        WHEN s.pref_industry AND (s.pref_region OR s.pref_agency) THEN 85
        WHEN s.pref_industry THEN 70
        WHEN s.pref_region OR s.pref_agency THEN 60
        ELSE 30
      END::numeric                                      AS profile_score,

      -- 데이터 품질
      CASE
        WHEN (industry_rates ? COALESCE(s.industry_code,''))
          AND (agency_rates ? COALESCE(s.demand_agency_name,''))
          AND (competition_avg ? COALESCE(s.industry_code,'')) THEN 'real'
        WHEN (industry_rates ? COALESCE(s.industry_code,''))
          OR (agency_rates ? COALESCE(s.demand_agency_name,'')) THEN 'partial'
        ELSE 'insufficient'
      END                                               AS data_quality
    FROM scored s
  ),
  scored_with_scores AS (
    SELECT
      sf.*,
      -- 낙찰 가능성 점수 (가중합)
      ROUND(
        sf.ind_score    * 0.30 +
        sf.agn_score    * 0.25 +
        sf.rgn_score    * 0.15 +
        sf.budget_score * 0.10 +
        sf.comp_score   * 0.10 +
        sf.urgency_score * 0.05 +
        sf.profile_score * 0.05,
        2
      )                                                 AS win_probability,

      -- 수익성 점수
      ROUND(
        LEAST(100,
          COALESCE(sf.budget_amount, 0) / 1000000000.0 * 40
        ) * 0.40 +
        ROUND(
          sf.ind_score    * 0.30 +
          sf.agn_score    * 0.25 +
          sf.rgn_score    * 0.15 +
          sf.budget_score * 0.10 +
          sf.comp_score   * 0.10 +
          sf.urgency_score * 0.05 +
          sf.profile_score * 0.05,
          2
        ) * 0.35 +
        sf.comp_score  * 0.15 +
        sf.agn_score   * 0.10,
        2
      )                                                 AS profitability_score,

      -- 추천 이유 텍스트 (가장 높은 기여 차원 기반)
      CASE
        WHEN sf.pref_industry AND sf.pref_agency
          THEN '선호 업종 · 기관과 일치하며 AI 종합 점수가 높습니다'
        WHEN sf.pref_industry
          THEN '선호 업종과 일치하는 공고입니다'
        WHEN sf.comp_score >= 70 AND sf.has_comp
          THEN '동종 업계 평균 경쟁 업체 수가 적습니다'
        WHEN sf.agn_score >= 70 AND sf.has_agn
          THEN '이 기관의 평균 낙찰률이 상대적으로 높습니다'
        WHEN sf.ind_score >= 70 AND sf.has_ind
          THEN '이 업종의 낙찰 패턴이 유리합니다'
        WHEN sf.urgency_score >= 85
          THEN '마감까지 준비 시간이 충분합니다'
        WHEN sf.budget_fit
          THEN '귀사 목표 예산 범위와 일치합니다'
        WHEN sf.data_quality = 'insufficient'
          THEN '관련 분석 데이터가 아직 충분하지 않습니다'
        ELSE '종합 점수 기준 상위 추천 공고입니다'
      END                                               AS reason
    FROM scored_full sf
  )

  -- ─── Round 1: AI 추천 ────────────────────────────────────────────────────
  SELECT ARRAY_AGG(id ORDER BY
    (win_probability * 0.45 + profitability_score * 0.20 +
     comp_score * 0.15 + profile_score * 0.20) DESC
    NULLS LAST
  )
  INTO recommended_ids
  FROM (
    SELECT id, win_probability, profitability_score, comp_score, profile_score
    FROM scored_with_scores
    ORDER BY (win_probability * 0.45 + profitability_score * 0.20 +
              comp_score * 0.15 + profile_score * 0.20) DESC
    LIMIT p_limit
  ) r;

  recommended_ids := COALESCE(recommended_ids, '{}');

  -- ─── Round 2: 낙찰 가능성 높음 ──────────────────────────────────────────
  SELECT ARRAY_AGG(id ORDER BY win_probability DESC NULLS LAST)
  INTO high_prob_ids
  FROM (
    SELECT id, win_probability
    FROM scored_with_scores
    WHERE win_probability >= 60
      AND NOT (id = ANY(recommended_ids))
    ORDER BY win_probability DESC
    LIMIT p_limit
  ) r;

  high_prob_ids := COALESCE(high_prob_ids, '{}');

  -- ─── Round 3: 경쟁 적음 ─────────────────────────────────────────────────
  SELECT ARRAY_AGG(id ORDER BY avg_bidders_raw ASC NULLS LAST, budget_amount DESC NULLS LAST)
  INTO low_comp_ids
  FROM (
    SELECT id, avg_bidders_raw, budget_amount
    FROM scored_with_scores
    WHERE NOT (id = ANY(recommended_ids || high_prob_ids))
    ORDER BY avg_bidders_raw ASC NULLS LAST, budget_amount DESC NULLS LAST
    LIMIT p_limit
  ) r;

  low_comp_ids := COALESCE(low_comp_ids, '{}');

  -- ─── 데이터 조합 ─────────────────────────────────────────────────────────
  SELECT jsonb_agg(row_to_json(r)) INTO recommended_data
  FROM (
    SELECT
      s.id, s.source_tender_id, s.title,
      s.industry_code, s.industry_name, s.region_code, s.region_name,
      s.demand_agency_name, s.budget_amount, s.deadline_at,
      s.ind_avg_rate, s.agn_avg_rate, s.avg_bidders_raw AS avg_bidders,
      s.comp_score, s.profile_score,
      s.win_probability,
      ROUND((s.win_probability * 0.45 + s.profitability_score * 0.20 +
             s.comp_score * 0.15 + s.profile_score * 0.20)::numeric, 2) AS total_score,
      s.reason, s.data_quality
    FROM scored_with_scores s
    WHERE s.id = ANY(recommended_ids)
    ORDER BY (s.win_probability * 0.45 + s.profitability_score * 0.20 +
              s.comp_score * 0.15 + s.profile_score * 0.20) DESC
  ) r;

  SELECT jsonb_agg(row_to_json(r)) INTO high_prob_data
  FROM (
    SELECT
      s.id, s.source_tender_id, s.title,
      s.industry_code, s.industry_name, s.region_code, s.region_name,
      s.demand_agency_name, s.budget_amount, s.deadline_at,
      s.ind_avg_rate, s.agn_avg_rate, s.avg_bidders_raw AS avg_bidders,
      s.comp_score, s.profile_score,
      s.win_probability,
      s.win_probability AS total_score,
      s.reason, s.data_quality
    FROM scored_with_scores s
    WHERE s.id = ANY(high_prob_ids)
    ORDER BY s.win_probability DESC
  ) r;

  SELECT jsonb_agg(row_to_json(r)) INTO low_comp_data
  FROM (
    SELECT
      s.id, s.source_tender_id, s.title,
      s.industry_code, s.industry_name, s.region_code, s.region_name,
      s.demand_agency_name, s.budget_amount, s.deadline_at,
      s.ind_avg_rate, s.agn_avg_rate, s.avg_bidders_raw AS avg_bidders,
      s.comp_score, s.profile_score,
      s.win_probability,
      s.comp_score AS total_score,
      -- 경쟁 카드용 이유 재계산
      CASE
        WHEN s.has_comp THEN
          format('평균 경쟁 업체 수 %.1f개 (데이터 기반)', s.avg_bidders_raw)
        ELSE '경쟁 데이터가 부족한 공고입니다 (기회 가능성)'
      END AS reason,
      s.data_quality
    FROM scored_with_scores s
    WHERE s.id = ANY(low_comp_ids)
    ORDER BY s.avg_bidders_raw ASC NULLS LAST
  ) r;

  SELECT jsonb_agg(row_to_json(r)) INTO profit_data
  FROM (
    SELECT
      s.id, s.source_tender_id, s.title,
      s.industry_code, s.industry_name, s.region_code, s.region_name,
      s.demand_agency_name, s.budget_amount, s.deadline_at,
      s.ind_avg_rate, s.agn_avg_rate, s.avg_bidders_raw AS avg_bidders,
      s.comp_score, s.profile_score,
      s.win_probability,
      s.profitability_score AS total_score,
      CASE
        WHEN s.budget_amount IS NOT NULL
          THEN format('예산 %s, 기회 점수 %.0f점', 
            CASE 
              WHEN s.budget_amount >= 1000000000 THEN to_char(s.budget_amount/100000000, 'FM999') || '억원'
              ELSE to_char(s.budget_amount/10000, 'FM999,999') || '만원'
            END,
            s.win_probability)
        ELSE '고예산 공고입니다'
      END AS reason,
      s.data_quality
    FROM scored_with_scores s
    WHERE s.budget_amount IS NOT NULL
      AND NOT (s.id = ANY(recommended_ids || high_prob_ids || low_comp_ids))
    ORDER BY s.profitability_score DESC
    LIMIT p_limit
  ) r;

  RETURN jsonb_build_object(
    'recommended',       COALESCE(recommended_data, '[]'::jsonb),
    'high_probability',  COALESCE(high_prob_data, '[]'::jsonb),
    'low_competition',   COALESCE(low_comp_data, '[]'::jsonb),
    'high_profitability',COALESCE(profit_data, '[]'::jsonb),
    'has_profile',       (p_user_id IS NOT NULL AND p_industry_codes IS NOT NULL),
    'coverage',          coverage,
    'computed_at',       NOW()
  );
END;
$$;

-- ── 5. refresh_analysis_cache() — 글로벌 캐시 갱신 ─────────────────────────
CREATE OR REPLACE FUNCTION refresh_analysis_cache()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  insights JSONB;
BEGIN
  insights := get_ai_insights_v2(10);

  INSERT INTO analysis_cache (cache_key, data, computed_at, expires_at)
  VALUES (
    'ai_insights_v2_global',
    insights,
    NOW(),
    NOW() + INTERVAL '6 hours'
  )
  ON CONFLICT (cache_key) DO UPDATE
    SET data        = EXCLUDED.data,
        computed_at = EXCLUDED.computed_at,
        expires_at  = EXCLUDED.expires_at;

  RETURN jsonb_build_object(
    'success', TRUE,
    'computed_at', NOW(),
    'open_tenders', insights -> 'coverage' -> 'tenders_open_count'
  );
END;
$$;

-- ── 6. 인덱스 추가 (분석 쿼리 최적화) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenders_open_deadline
  ON tenders (status, deadline_at)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_tenders_industry_status
  ON tenders (industry_code, status)
  WHERE industry_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenders_agency_status
  ON tenders (demand_agency_name, status)
  WHERE demand_agency_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_awards_tender_rate
  ON awards (tender_id, awarded_rate)
  WHERE awarded_rate IS NOT NULL;
