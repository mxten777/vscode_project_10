-- ============================================================================
-- Migration: 004_report_summary_function.sql
-- 리포트 성능 개선: Postgres 함수로 집계 처리
-- ============================================================================

-- 기존 함수가 있다면 삭제
DROP FUNCTION IF EXISTS report_summary(timestamptz, timestamptz);

-- 리포트 요약 집계 함수 생성
CREATE OR REPLACE FUNCTION report_summary(
  from_date timestamptz DEFAULT NULL,
  to_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_tenders_count int;
  total_budget_sum numeric;
  status_dist jsonb;
  top_agencies_arr jsonb;
  top_industries_arr jsonb;
BEGIN
  -- 1) 총 공고 수
  SELECT COUNT(*)
  INTO total_tenders_count
  FROM tenders
  WHERE (from_date IS NULL OR published_at >= from_date)
    AND (to_date IS NULL OR published_at <= to_date);

  -- 2) 총 예산 합
  SELECT COALESCE(SUM(budget_amount), 0)
  INTO total_budget_sum
  FROM tenders
  WHERE (from_date IS NULL OR published_at >= from_date)
    AND (to_date IS NULL OR published_at <= to_date);

  -- 3) 상태 분포
  SELECT jsonb_agg(
    jsonb_build_object(
      'status', status,
      'count', cnt
    ) ORDER BY cnt DESC
  )
  INTO status_dist
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM tenders
    WHERE (from_date IS NULL OR published_at >= from_date)
      AND (to_date IS NULL OR published_at <= to_date)
    GROUP BY status
  ) sub;

  -- 4) 기관 TOP 10
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', agency_name,
      'count', cnt
    ) ORDER BY cnt DESC
  )
  INTO top_agencies_arr
  FROM (
    SELECT a.name as agency_name, COUNT(*) as cnt
    FROM tenders t
    JOIN agencies a ON t.agency_id = a.id
    WHERE (from_date IS NULL OR t.published_at >= from_date)
      AND (to_date IS NULL OR t.published_at <= to_date)
    GROUP BY a.name
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;

  -- 5) 업종 TOP 10
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', industry_name,
      'count', cnt
    ) ORDER BY cnt DESC
  )
  INTO top_industries_arr
  FROM (
    SELECT 
      COALESCE(industry_name, 'N/A') as industry_name, 
      COUNT(*) as cnt
    FROM tenders
    WHERE (from_date IS NULL OR published_at >= from_date)
      AND (to_date IS NULL OR published_at <= to_date)
    GROUP BY industry_name
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;

  -- 결과 조합
  result := jsonb_build_object(
    'totalTenders', total_tenders_count,
    'totalBudget', total_budget_sum,
    'statusDistribution', COALESCE(status_dist, '[]'::jsonb),
    'topAgencies', COALESCE(top_agencies_arr, '[]'::jsonb),
    'topIndustries', COALESCE(top_industries_arr, '[]'::jsonb)
  );

  RETURN result;
END;
$$;

-- COMMENT 추가
COMMENT ON FUNCTION report_summary(timestamptz, timestamptz) IS 
  '리포트 요약 집계: 공고 수, 예산 합, 상태 분포, 기관/업종 TOP 10을 단일 쿼리로 처리';
