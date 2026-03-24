-- ============================================================================
-- Migration: 009_bid_analysis_enhancements.sql
-- recommend_bid_price() 함수 개선: 낙찰하한율(lower_limit_rate) 반영
-- ============================================================================

-- 투찰가 추천 함수 (v2) - 낙찰하한율 반영
CREATE OR REPLACE FUNCTION recommend_bid_price(
  target_tender_id UUID,
  analysis_months INT DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  similar_bids UUID[];
  stats JSONB;
  estimated_price NUMERIC;
  lower_limit NUMERIC;
  result JSONB;
  similar_count INT;
  data_quality NUMERIC;
  aggressive_rate NUMERIC;
  warnings JSONB := '[]'::jsonb;
BEGIN
  -- 대상 공고 예정가격 조회
  SELECT budget_amount INTO estimated_price
  FROM public.tenders
  WHERE id = target_tender_id;

  IF estimated_price IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'NO_ESTIMATED_PRICE',
      'message', '예정가격 정보가 없습니다'
    );
  END IF;

  -- bid_notices에서 낙찰하한율 조회 (연결된 공고가 있는 경우)
  SELECT lower_limit_rate INTO lower_limit
  FROM bid_notices
  WHERE tender_id = target_tender_id
  LIMIT 1;

  -- 유사 낙찰 사례 검색
  SELECT ARRAY_AGG(bid_notice_id)
  INTO similar_bids
  FROM get_similar_bids(target_tender_id, null, 30, analysis_months)
  WHERE similarity_score >= 0.3; -- 최소 30% 유사도

  similar_count := COALESCE(ARRAY_LENGTH(similar_bids, 1), 0);

  IF similar_count < 3 THEN
    RETURN jsonb_build_object(
      'error', 'INSUFFICIENT_DATA',
      'message', '유사 사례가 부족합니다 (최소 3건 필요)',
      'similar_count', similar_count
    );
  END IF;

  -- 통계 계산
  stats := calculate_bid_rate_stats(similar_bids);

  -- 데이터 품질 점수 (사례 수 기반)
  data_quality := LEAST(1.0, similar_count / 20.0);

  -- 경고 누적
  IF similar_count < 10 THEN
    warnings := warnings || '["유사 사례가 10건 미만입니다"]'::jsonb;
  END IF;
  IF (stats->>'stddev')::numeric > 10 THEN
    warnings := warnings || '["낙찰률 변동성이 큽니다"]'::jsonb;
  END IF;

  -- 공격적 전략: 낙찰하한율 적용 (하한율보다 낮으면 클램프)
  aggressive_rate := (stats->>'p25')::numeric;
  IF lower_limit IS NOT NULL AND aggressive_rate < lower_limit THEN
    warnings := warnings || jsonb_build_array(
      format('낙찰하한율(%s%%)로 인해 공격적 전략이 상향 조정되었습니다', lower_limit)
    );
    aggressive_rate := lower_limit;
  END IF;

  -- 추천 결과 생성
  result := jsonb_build_object(
    -- 보수적 전략 (높은 낙찰률 - 안전하지만 수익성 낮음)
    'conservative', jsonb_build_object(
      'rate', stats->>'p75',
      'amount', ROUND(estimated_price * (stats->>'p75')::numeric / 100, 0),
      'confidence', CASE
        WHEN similar_count >= 15 THEN 'HIGH'
        WHEN similar_count >= 8 THEN 'MEDIUM'
        ELSE 'LOW'
      END,
      'description', '낙찰 확률 높음 (75th percentile), 수익성 낮음'
    ),

    -- 기준 전략 (중앙값 - 균형잡힌 접근)
    'standard', jsonb_build_object(
      'rate', stats->>'median',
      'amount', ROUND(estimated_price * (stats->>'median')::numeric / 100, 0),
      'confidence', CASE
        WHEN similar_count >= 15 THEN 'HIGH'
        WHEN similar_count >= 8 THEN 'MEDIUM'
        ELSE 'LOW'
      END,
      'description', '중간 전략 (median), 균형잡힌 접근'
    ),

    -- 공격적 전략 (25th percentile, 하한율 클램프 적용됨)
    'aggressive', jsonb_build_object(
      'rate', aggressive_rate,
      'amount', ROUND(estimated_price * aggressive_rate / 100, 0),
      'confidence', CASE
        WHEN similar_count >= 15 THEN 'MEDIUM'
        WHEN similar_count >= 8 THEN 'LOW'
        ELSE 'VERY_LOW'
      END,
      'description', CASE
        WHEN lower_limit IS NOT NULL AND (stats->>'p25')::numeric < lower_limit
        THEN format('낙찰하한율(%s%%) 적용 (원래 %.2f%%)', lower_limit, (stats->>'p25')::numeric)
        ELSE '수익성 높음 (25th percentile), 낙찰 확률 낮음'
      END
    ),

    -- 메타 정보
    'metadata', jsonb_build_object(
      'similar_count', similar_count,
      'analysis_months', analysis_months,
      'data_quality', ROUND(data_quality, 2),
      'lower_limit_rate', lower_limit,
      'stats', stats
    ),

    'warnings', warnings
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION recommend_bid_price IS '투찰가 추천 v2: 보수적/기준/공격적 전략 + 낙찰하한율(lower_limit_rate) 반영';
