-- ============================================================================
-- Migration: 011_fix_report_summary_agency.sql
-- 리포트 발주기관명 누락 수정
-- 원인: INNER JOIN agencies 로 인해 agency_id = NULL 공고 제외됨
-- 수정: demand_agency_name을 직접 사용 (LEFT JOIN + COALESCE)
-- ============================================================================

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
  -- LEFT JOIN 으로 변경 + COALESCE(demand_agency_name, a.name) 사용
  -- → agency_id = NULL 이어도 demand_agency_name이 있으면 집계에 포함
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', agency_name,
      'count', cnt
    ) ORDER BY cnt DESC
  )
  INTO top_agencies_arr
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(t.demand_agency_name), ''), a.name, '기관명 없음') AS agency_name,
      COUNT(*) AS cnt
    FROM tenders t
    LEFT JOIN agencies a ON t.agency_id = a.id
    WHERE (from_date IS NULL OR t.published_at >= from_date)
      AND (to_date IS NULL OR t.published_at <= to_date)
    GROUP BY COALESCE(NULLIF(TRIM(t.demand_agency_name), ''), a.name, '기관명 없음')
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
      COALESCE(NULLIF(TRIM(industry_name), ''), 'N/A') AS industry_name,
      COUNT(*) AS cnt
    FROM tenders
    WHERE (from_date IS NULL OR published_at >= from_date)
      AND (to_date IS NULL OR published_at <= to_date)
    GROUP BY COALESCE(NULLIF(TRIM(industry_name), ''), 'N/A')
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

COMMENT ON FUNCTION report_summary(timestamptz, timestamptz) IS
  '리포트 요약 집계: 공고 수, 예산 합, 상태 분포, 기관/업종 TOP 10 (demand_agency_name 직접 사용)';
