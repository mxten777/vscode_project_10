-- ============================================================================
-- Migration 026: AI 입찰 의사결정 플랫폼 고도화
-- 목적:
--   1. 기존 테이블에 누락 컬럼 추가 (awards.participant_count, tenders.base_amount 등)
--   2. 신규 분석 테이블 추가 (agency_analysis, industry_analysis, region_analysis, bid_participants)
--   3. 집계 재구성 RPC 함수 추가 (rebuild_agency_analysis 등)
--   4. 대시보드 집계 RPC (get_dashboard_summary)
--   5. 운영 상태 모니터링 RPC (get_ingestion_status)
--   6. 트렌딩 키워드 RPC (get_trending_keywords)
-- ============================================================================

-- ============================================================================
-- 1. 기존 테이블 컬럼 추가
-- ============================================================================

-- 1-1. tenders: 공고차수, 기초금액, API 소스 추가
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS notice_ord    text,     -- 공고차수 (bidNtceOrd)
  ADD COLUMN IF NOT EXISTS base_amount   numeric,  -- 기초금액 (bsnsYear 기반 예산 vs 예정가격 구분)
  ADD COLUMN IF NOT EXISTS api_source    text DEFAULT 'nara_openapi'; -- 데이터 출처

COMMENT ON COLUMN public.tenders.notice_ord  IS '공고차수 (기본 00, 변경 01, 02…)';
COMMENT ON COLUMN public.tenders.base_amount IS '기초금액 (나라장터의 presmptPrce 구분 전 원래 예산액)';
COMMENT ON COLUMN public.tenders.api_source  IS '수집 API 소스 식별자';

-- 1-2. awards: 참여업체수, 개찰순위, 예비가격 추가
ALTER TABLE public.awards
  ADD COLUMN IF NOT EXISTS participant_count  int,      -- 참여업체수 (prtcptCnum)
  ADD COLUMN IF NOT EXISTS open_rank          int,      -- 개찰순위 (1위=낙찰)
  ADD COLUMN IF NOT EXISTS reserve_price      numeric,  -- 예비가격 (presmptPrce)
  ADD COLUMN IF NOT EXISTS bid_notice_no      text,     -- 입찰공고번호 (bidNtceNo)
  ADD COLUMN IF NOT EXISTS bid_notice_ord     text,     -- 입찰공고차수 (bidNtceOrd)
  ADD COLUMN IF NOT EXISTS result_status      text      -- 'awarded'|'failed'|'partial'
    CHECK (result_status IN ('awarded','failed','partial') OR result_status IS NULL);

COMMENT ON COLUMN public.awards.participant_count IS 'API prtcptCnum. NULL이면 데이터 부족';
COMMENT ON COLUMN public.awards.open_rank         IS '개찰순위. 1=최저가 낙찰';
COMMENT ON COLUMN public.awards.reserve_price     IS '예비가격. 예정가격과 별도 개념';
COMMENT ON COLUMN public.awards.result_status     IS 'awarded=낙찰, failed=유찰, partial=부분낙찰';

-- 1-3. agencies: 집계 카운터 추가
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS region_name         text,
  ADD COLUMN IF NOT EXISTS agency_type         text,    -- '지방자치단체'|'공기업'|'정부기관' 등
  ADD COLUMN IF NOT EXISTS total_notice_count  int  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_result_count  int  DEFAULT 0;

-- ============================================================================
-- 2. 신규 테이블
-- ============================================================================

-- 2-1. bid_participants: 개찰순위 별 참여업체 정보
CREATE TABLE IF NOT EXISTS public.bid_participants (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id     uuid        REFERENCES public.tenders(id) ON DELETE CASCADE,
  notice_no     text        NOT NULL,    -- 입찰공고번호
  notice_ord    text        NOT NULL DEFAULT '00',
  company_name  text        NOT NULL,
  bid_rank      int,                     -- 개찰순위 (1위=최저가)
  bid_amount    numeric,
  bid_rate      numeric,                 -- 투찰률 (%)
  is_winner     boolean     DEFAULT false,
  raw_json      jsonb,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bid_participants_tender_id
  ON public.bid_participants (tender_id);
CREATE INDEX IF NOT EXISTS idx_bid_participants_notice_no
  ON public.bid_participants (notice_no, notice_ord);
CREATE INDEX IF NOT EXISTS idx_bid_participants_company_name
  ON public.bid_participants (company_name);

-- 2-2. agency_analysis: 기관별 분석 캐시
CREATE TABLE IF NOT EXISTS public.agency_analysis (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_code       text        NOT NULL UNIQUE,
  agency_name       text        NOT NULL,
  avg_award_rate    numeric,    -- 평균 낙찰률 (%)
  avg_participants  numeric,    -- 평균 참여업체 수
  total_notices     int  DEFAULT 0,
  total_results     int  DEFAULT 0,
  avg_budget        numeric,    -- 평균 예산 (원)
  data_quality      text  DEFAULT 'insufficient'
    CHECK (data_quality IN ('real','partial','insufficient')),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_analysis_avg_award_rate
  ON public.agency_analysis (avg_award_rate DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_agency_analysis_total_results
  ON public.agency_analysis (total_results DESC NULLS LAST);

-- 2-3. industry_analysis: 업종별 분석 캐시
CREATE TABLE IF NOT EXISTS public.industry_analysis (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_code     text        NOT NULL UNIQUE,
  industry_name     text        NOT NULL,
  avg_award_rate    numeric,
  avg_participants  numeric,
  total_results     int  DEFAULT 0,
  avg_budget        numeric,
  data_quality      text  DEFAULT 'insufficient'
    CHECK (data_quality IN ('real','partial','insufficient')),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industry_analysis_avg_award_rate
  ON public.industry_analysis (avg_award_rate DESC NULLS LAST);

-- 2-4. region_analysis: 지역별 분석 캐시
CREATE TABLE IF NOT EXISTS public.region_analysis (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code       text        NOT NULL UNIQUE,
  region_name       text        NOT NULL,
  avg_award_rate    numeric,
  avg_participants  numeric,
  total_results     int  DEFAULT 0,
  avg_budget        numeric,
  data_quality      text  DEFAULT 'insufficient'
    CHECK (data_quality IN ('real','partial','insufficient')),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_region_analysis_total_results
  ON public.region_analysis (total_results DESC NULLS LAST);

-- ============================================================================
-- 3. RLS 정책 (bid_participants는 service role 전용, analysis 테이블은 읽기 가능)
-- ============================================================================

ALTER TABLE public.bid_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_analysis   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_analysis   ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 읽기 허용
CREATE POLICY "auth_users_read_bid_participants"
  ON public.bid_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_users_read_agency_analysis"
  ON public.agency_analysis FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_users_read_industry_analysis"
  ON public.industry_analysis FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_users_read_region_analysis"
  ON public.region_analysis FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 4. 집계 재구성 RPC 함수들
-- ============================================================================

-- 4-1. agency_analysis 재구성
CREATE OR REPLACE FUNCTION rebuild_agency_analysis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upserted int := 0;
BEGIN
  WITH agg AS (
    SELECT
      ag.code                                AS agency_code,
      ag.name                                AS agency_name,
      COUNT(DISTINCT t.id)                   AS total_notices,
      COUNT(DISTINCT aw.id)                  AS total_results,
      AVG(aw.awarded_rate)                   AS avg_award_rate,
      AVG(aw.participant_count)              AS avg_participants,
      AVG(t.budget_amount)                   AS avg_budget,
      CASE
        WHEN COUNT(DISTINCT aw.id) >= 30 THEN 'real'
        WHEN COUNT(DISTINCT aw.id) >= 5  THEN 'partial'
        ELSE 'insufficient'
      END                                    AS data_quality
    FROM public.agencies ag
    LEFT JOIN public.tenders t  ON t.agency_id = ag.id
    LEFT JOIN public.awards aw  ON aw.tender_id = t.id
      AND aw.awarded_rate IS NOT NULL
    GROUP BY ag.code, ag.name
    HAVING COUNT(DISTINCT t.id) > 0
  )
  INSERT INTO public.agency_analysis
    (agency_code, agency_name, avg_award_rate, avg_participants,
     total_notices, total_results, avg_budget, data_quality, updated_at)
  SELECT
    agency_code, agency_name,
    ROUND(avg_award_rate::numeric, 2),
    ROUND(avg_participants::numeric, 1),
    total_notices, total_results,
    ROUND(avg_budget::numeric, 0),
    data_quality,
    NOW()
  FROM agg
  ON CONFLICT (agency_code) DO UPDATE SET
    agency_name      = EXCLUDED.agency_name,
    avg_award_rate   = EXCLUDED.avg_award_rate,
    avg_participants = EXCLUDED.avg_participants,
    total_notices    = EXCLUDED.total_notices,
    total_results    = EXCLUDED.total_results,
    avg_budget       = EXCLUDED.avg_budget,
    data_quality     = EXCLUDED.data_quality,
    updated_at       = NOW();

  GET DIAGNOSTICS v_upserted = ROW_COUNT;
  RETURN jsonb_build_object('upserted', v_upserted, 'completed_at', NOW());
END;
$$;

-- 4-2. industry_analysis 재구성
CREATE OR REPLACE FUNCTION rebuild_industry_analysis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upserted int := 0;
BEGIN
  WITH agg AS (
    SELECT
      t.industry_code,
      COALESCE(MAX(t.industry_name), t.industry_code) AS industry_name,
      COUNT(DISTINCT t.id)                             AS total_notices_all,
      COUNT(DISTINCT aw.id)                            AS total_results,
      AVG(aw.awarded_rate)                             AS avg_award_rate,
      AVG(aw.participant_count)                        AS avg_participants,
      AVG(t.budget_amount)                             AS avg_budget,
      CASE
        WHEN COUNT(DISTINCT aw.id) >= 30 THEN 'real'
        WHEN COUNT(DISTINCT aw.id) >= 5  THEN 'partial'
        ELSE 'insufficient'
      END AS data_quality
    FROM public.tenders t
    LEFT JOIN public.awards aw ON aw.tender_id = t.id
      AND aw.awarded_rate IS NOT NULL
    WHERE t.industry_code IS NOT NULL
    GROUP BY t.industry_code
    HAVING COUNT(DISTINCT t.id) > 0
  )
  INSERT INTO public.industry_analysis
    (industry_code, industry_name, avg_award_rate, avg_participants,
     total_results, avg_budget, data_quality, updated_at)
  SELECT
    industry_code, industry_name,
    ROUND(avg_award_rate::numeric, 2),
    ROUND(avg_participants::numeric, 1),
    total_results,
    ROUND(avg_budget::numeric, 0),
    data_quality,
    NOW()
  FROM agg
  ON CONFLICT (industry_code) DO UPDATE SET
    industry_name    = EXCLUDED.industry_name,
    avg_award_rate   = EXCLUDED.avg_award_rate,
    avg_participants = EXCLUDED.avg_participants,
    total_results    = EXCLUDED.total_results,
    avg_budget       = EXCLUDED.avg_budget,
    data_quality     = EXCLUDED.data_quality,
    updated_at       = NOW();

  GET DIAGNOSTICS v_upserted = ROW_COUNT;
  RETURN jsonb_build_object('upserted', v_upserted, 'completed_at', NOW());
END;
$$;

-- 4-3. region_analysis 재구성
CREATE OR REPLACE FUNCTION rebuild_region_analysis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upserted int := 0;
BEGIN
  WITH agg AS (
    SELECT
      t.region_code,
      COALESCE(MAX(t.region_name), t.region_code) AS region_name,
      COUNT(DISTINCT t.id)                         AS total_notices_all,
      COUNT(DISTINCT aw.id)                        AS total_results,
      AVG(aw.awarded_rate)                         AS avg_award_rate,
      AVG(aw.participant_count)                    AS avg_participants,
      AVG(t.budget_amount)                         AS avg_budget,
      CASE
        WHEN COUNT(DISTINCT aw.id) >= 30 THEN 'real'
        WHEN COUNT(DISTINCT aw.id) >= 5  THEN 'partial'
        ELSE 'insufficient'
      END AS data_quality
    FROM public.tenders t
    LEFT JOIN public.awards aw ON aw.tender_id = t.id
      AND aw.awarded_rate IS NOT NULL
    WHERE t.region_code IS NOT NULL
    GROUP BY t.region_code
    HAVING COUNT(DISTINCT t.id) > 0
  )
  INSERT INTO public.region_analysis
    (region_code, region_name, avg_award_rate, avg_participants,
     total_results, avg_budget, data_quality, updated_at)
  SELECT
    region_code, region_name,
    ROUND(avg_award_rate::numeric, 2),
    ROUND(avg_participants::numeric, 1),
    total_results,
    ROUND(avg_budget::numeric, 0),
    data_quality,
    NOW()
  FROM agg
  ON CONFLICT (region_code) DO UPDATE SET
    region_name      = EXCLUDED.region_name,
    avg_award_rate   = EXCLUDED.avg_award_rate,
    avg_participants = EXCLUDED.avg_participants,
    total_results    = EXCLUDED.total_results,
    avg_budget       = EXCLUDED.avg_budget,
    data_quality     = EXCLUDED.data_quality,
    updated_at       = NOW();

  GET DIAGNOSTICS v_upserted = ROW_COUNT;
  RETURN jsonb_build_object('upserted', v_upserted, 'completed_at', NOW());
END;
$$;

-- 4-4. agencies.total_notice_count / total_result_count 동기화
CREATE OR REPLACE FUNCTION sync_agency_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.agencies ag
  SET
    total_notice_count = (
      SELECT COUNT(*) FROM public.tenders t WHERE t.agency_id = ag.id
    ),
    total_result_count = (
      SELECT COUNT(*) FROM public.tenders t
      JOIN public.awards aw ON aw.tender_id = t.id
      WHERE t.agency_id = ag.id AND aw.awarded_rate IS NOT NULL
    );

  RETURN jsonb_build_object('synced_at', NOW());
END;
$$;

-- ============================================================================
-- 5. 대시보드 집계 RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH
  tender_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'OPEN')                        AS open_count,
      COUNT(*) FILTER (WHERE status = 'CLOSED')                      AS closed_count,
      COUNT(*) FILTER (WHERE status = 'RESULT')                      AS result_count,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS new_today,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')  AS new_this_week,
      COUNT(*)                                                         AS total_count
    FROM public.tenders
  ),
  award_stats AS (
    SELECT
      COUNT(*)                                          AS total_awards,
      ROUND(AVG(awarded_rate)::numeric, 2)              AS avg_award_rate,
      SUM(awarded_amount)                               AS total_awarded_amount,
      COUNT(*) FILTER (WHERE participant_count IS NOT NULL) AS awards_with_participants,
      ROUND(AVG(participant_count)::numeric, 1)         AS avg_participants
    FROM public.awards
    WHERE awarded_rate IS NOT NULL
  ),
  collection_status AS (
    SELECT
      MAX(finished_at) FILTER (WHERE job_type = 'tenders' AND status = 'completed') AS last_tender_collection,
      MAX(finished_at) FILTER (WHERE job_type = 'awards'  AND status = 'completed') AS last_award_collection,
      COUNT(*) FILTER (WHERE status = 'failed' AND started_at > NOW() - INTERVAL '24 hours') AS recent_failures
    FROM public.collection_logs
  ),
  coverage AS (
    SELECT
      (SELECT COUNT(*) FROM public.agency_analysis WHERE data_quality = 'real')       AS agencies_real,
      (SELECT COUNT(*) FROM public.industry_analysis WHERE data_quality = 'real')     AS industries_real,
      (SELECT COUNT(*) FROM public.region_analysis WHERE data_quality = 'real')       AS regions_real,
      (SELECT COUNT(*) FROM public.awards WHERE participant_count IS NOT NULL)        AS awards_with_participants
  )
  SELECT jsonb_build_object(
    'tender_stats',       row_to_json(tender_stats),
    'award_stats',        row_to_json(award_stats),
    'collection_status',  row_to_json(collection_status),
    'data_coverage',      row_to_json(coverage),
    'computed_at',        NOW()
  )
  INTO result
  FROM tender_stats, award_stats, collection_status, coverage;

  RETURN result;
END;
$$;

-- ============================================================================
-- 6. 운영 상태 모니터링 RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ingestion_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'tenders', jsonb_build_object(
        'last_success_at',    MAX(finished_at) FILTER (WHERE job_type = 'tenders' AND status = 'completed'),
        'last_failure_at',    MAX(finished_at) FILTER (WHERE job_type = 'tenders' AND status = 'failed'),
        'recent_count',       COALESCE(SUM(records_collected) FILTER (
                                WHERE job_type = 'tenders' AND started_at > NOW() - INTERVAL '24 hours'
                              ), 0),
        'failure_count_24h',  COUNT(*) FILTER (
                                WHERE job_type = 'tenders' AND status = 'failed'
                                AND started_at > NOW() - INTERVAL '24 hours'
                              )
      ),
      'awards', jsonb_build_object(
        'last_success_at',    MAX(finished_at) FILTER (WHERE job_type = 'awards' AND status = 'completed'),
        'last_failure_at',    MAX(finished_at) FILTER (WHERE job_type = 'awards' AND status = 'failed'),
        'recent_count',       COALESCE(SUM(records_collected) FILTER (
                                WHERE job_type = 'awards' AND started_at > NOW() - INTERVAL '24 hours'
                              ), 0),
        'failure_count_24h',  COUNT(*) FILTER (
                                WHERE job_type = 'awards' AND status = 'failed'
                                AND started_at > NOW() - INTERVAL '24 hours'
                              )
      ),
      'analysis_last_rebuilt', (
        SELECT MAX(updated_at) FROM public.agency_analysis
      ),
      'computed_at', NOW()
    )
    FROM public.collection_logs
  );
END;
$$;

-- ============================================================================
-- 7. 트렌딩 키워드 RPC (실데이터 기반)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_trending_keywords(
  p_days   int DEFAULT 7,
  p_limit  int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- 최근 N일 공고 제목에서 주요 업종명/키워드 집계
  SELECT jsonb_agg(row_to_json(kw))
  INTO result
  FROM (
    SELECT
      industry_name   AS keyword,
      COUNT(*)        AS count,
      'industry'      AS type
    FROM public.tenders
    WHERE created_at > NOW() - (p_days || ' days')::interval
      AND industry_name IS NOT NULL
      AND status = 'OPEN'
    GROUP BY industry_name
    ORDER BY count DESC
    LIMIT p_limit
  ) kw;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- 8. 데이터 커버리지 감사 RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_data_coverage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'tenders', jsonb_build_object(
      'total',            (SELECT COUNT(*) FROM public.tenders),
      'with_budget',      (SELECT COUNT(*) FROM public.tenders WHERE budget_amount IS NOT NULL),
      'with_industry',    (SELECT COUNT(*) FROM public.tenders WHERE industry_code IS NOT NULL),
      'with_region',      (SELECT COUNT(*) FROM public.tenders WHERE region_code IS NOT NULL),
      'open',             (SELECT COUNT(*) FROM public.tenders WHERE status = 'OPEN'),
      'has_embedding',    (SELECT COUNT(*) FROM public.tenders WHERE title_embedding IS NOT NULL)
    ),
    'awards', jsonb_build_object(
      'total',              (SELECT COUNT(*) FROM public.awards),
      'with_award_rate',    (SELECT COUNT(*) FROM public.awards WHERE awarded_rate IS NOT NULL),
      'with_participants',  (SELECT COUNT(*) FROM public.awards WHERE participant_count IS NOT NULL),
      'with_reserve_price', (SELECT COUNT(*) FROM public.awards WHERE reserve_price IS NOT NULL)
    ),
    'analysis_cache', jsonb_build_object(
      'agency_count',          (SELECT COUNT(*) FROM public.agency_analysis),
      'agency_real',           (SELECT COUNT(*) FROM public.agency_analysis WHERE data_quality = 'real'),
      'industry_count',        (SELECT COUNT(*) FROM public.industry_analysis),
      'industry_real',         (SELECT COUNT(*) FROM public.industry_analysis WHERE data_quality = 'real'),
      'region_count',          (SELECT COUNT(*) FROM public.region_analysis),
      'region_real',           (SELECT COUNT(*) FROM public.region_analysis WHERE data_quality = 'real')
    ),
    'participants', jsonb_build_object(
      'total',   (SELECT COUNT(*) FROM public.bid_participants),
      'tenders_covered', (SELECT COUNT(DISTINCT tender_id) FROM public.bid_participants)
    ),
    'computed_at', NOW()
  );
END;
$$;

-- ============================================================================
-- 9. 분석 테이블 전체 재구성 (1회 호출로 모두 실행)
-- ============================================================================

CREATE OR REPLACE FUNCTION rebuild_all_analysis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency   jsonb;
  v_industry jsonb;
  v_region   jsonb;
  v_sync     jsonb;
BEGIN
  v_agency   := rebuild_agency_analysis();
  v_industry := rebuild_industry_analysis();
  v_region   := rebuild_region_analysis();
  v_sync     := sync_agency_counts();

  RETURN jsonb_build_object(
    'agency',   v_agency,
    'industry', v_industry,
    'region',   v_region,
    'sync',     v_sync,
    'completed_at', NOW()
  );
END;
$$;

-- ============================================================================
-- 10. 추가 인덱스
-- ============================================================================

-- awards.participant_count 기반 집계용
CREATE INDEX IF NOT EXISTS idx_awards_participant_count
  ON public.awards (participant_count)
  WHERE participant_count IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_awards_bid_notice_no
  ON public.awards (bid_notice_no)
  WHERE bid_notice_no IS NOT NULL;

-- tenders.base_amount
CREATE INDEX IF NOT EXISTS idx_tenders_base_amount
  ON public.tenders (base_amount)
  WHERE base_amount IS NOT NULL;

-- collection_logs 최근 상태 조회용
CREATE INDEX IF NOT EXISTS idx_collection_logs_job_type_started
  ON public.collection_logs (job_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_logs_status
  ON public.collection_logs (status, started_at DESC);

-- ============================================================================
-- 완료
-- ============================================================================
-- SELECT rebuild_all_analysis();      -- 최초 1회 수동 실행
-- SELECT audit_data_coverage();       -- 데이터 커버리지 확인
-- SELECT get_dashboard_summary();     -- 대시보드 집계 확인
