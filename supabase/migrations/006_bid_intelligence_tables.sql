-- ============================================================================
-- Migration: 006_bid_intelligence_tables.sql
-- 낙찰 분석 + 투찰가 추천 기능을 위한 테이블 추가
-- ============================================================================

-- 1) bid_notices: 입찰 공고 기본 정보 (나라장터 원본)
CREATE TABLE IF NOT EXISTS bid_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 연결
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  source_bid_notice_id TEXT UNIQUE NOT NULL, -- 나라장터 고유 ID
  
  -- 기본 정보
  notice_number TEXT NOT NULL, -- 공고번호
  notice_name TEXT NOT NULL, -- 공고명
  demand_organization TEXT, -- 수요기관
  contract_type TEXT, -- 계약방법 (일반경쟁/제한경쟁/지명경쟁)
  bid_type TEXT, -- 입찰방식 (전자입찰/서면입찰)
  
  -- 금액 정보
  base_amount NUMERIC(15,2), -- 기초금액
  estimated_price NUMERIC(15,2), -- 예정가격
  lower_limit_rate NUMERIC(5,2), -- 낙찰하한율 (%)
  
  -- 일정
  bid_start_datetime TIMESTAMPTZ, -- 입찰시작일시
  bid_end_datetime TIMESTAMPTZ, -- 입찰마감일시
  open_datetime TIMESTAMPTZ, -- 개찰일시
  
  -- 분류
  industry_code TEXT, -- 업종코드
  industry_name TEXT, -- 업종명
  region_code TEXT, -- 지역코드
  region_name TEXT, -- 지역명
  
  -- 메타
  raw_json JSONB, -- 원본 JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) bid_open_results: 개찰 결과
CREATE TABLE IF NOT EXISTS bid_open_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_notice_id UUID REFERENCES bid_notices(id) ON DELETE CASCADE,
  
  -- 개찰 정보
  opened_at TIMESTAMPTZ NOT NULL, -- 개찰일시
  total_bidders INT DEFAULT 0, -- 참여업체 수
  valid_bidders INT DEFAULT 0, -- 유효업체 수
  
  -- 투찰 통계
  highest_bid_rate NUMERIC(5,2), -- 최고 투찰률
  lowest_bid_rate NUMERIC(5,2), -- 최저 투찰률
  average_bid_rate NUMERIC(5,2), -- 평균 투찰률
  median_bid_rate NUMERIC(5,2), -- 중앙값 투찰률
  
  -- 낙찰 예정
  expected_winner_company TEXT, -- 낙찰예정자
  expected_winner_bid_rate NUMERIC(5,2), -- 낙찰예정률
  expected_winner_amount NUMERIC(15,2), -- 낙찰예정금액
  
  -- 메타
  is_successful BOOLEAN DEFAULT TRUE, -- 유찰 여부 (false = 유찰)
  failure_reason TEXT, -- 유찰 사유
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(bid_notice_id) -- 1 공고 = 1 개찰결과
);

-- 3) bid_awards: 최종 낙찰 결과
CREATE TABLE IF NOT EXISTS bid_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_notice_id UUID REFERENCES bid_notices(id) ON DELETE CASCADE,
  
  -- 낙찰 정보
  winner_company_name TEXT NOT NULL, -- 낙찰업체명
  winner_business_number TEXT, -- 사업자등록번호
  winner_bid_rate NUMERIC(5,2) NOT NULL, -- 낙찰률 (%)
  winner_bid_amount NUMERIC(15,2) NOT NULL, -- 낙찰금액
  
  -- 계약 정보
  contract_amount NUMERIC(15,2), -- 계약금액
  contract_date DATE, -- 계약일자
  contract_type TEXT, -- 계약방법
  
  -- 성과
  performance_guarantee_rate NUMERIC(5,2), -- 계약보증금률
  advance_payment_rate NUMERIC(5,2), -- 선금률
  
  -- 메타
  is_final BOOLEAN DEFAULT TRUE, -- 최종 낙찰 여부
  awarded_at TIMESTAMPTZ, -- 낙찰일시
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(bid_notice_id) -- 1 공고 = 1 낙찰결과 (MVP)
);

-- 4) bid_price_features: 분석용 파생 변수
CREATE TABLE IF NOT EXISTS bid_price_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_notice_id UUID REFERENCES bid_notices(id) ON DELETE CASCADE UNIQUE,
  
  -- 가격 파생 변수
  price_to_base_ratio NUMERIC(8,4), -- 예정가/기초금액 비율
  winner_rate_deviation NUMERIC(8,4), -- 낙찰률 - 평균 투찰률
  competition_intensity NUMERIC(8,4), -- 경쟁강도 (참여업체수 / 평균)
  
  -- 시장 파생 변수
  agency_avg_bid_rate NUMERIC(5,2), -- 해당 기관 평균 낙찰률
  industry_avg_bid_rate NUMERIC(5,2), -- 해당 업종 평균 낙찰률
  region_avg_bid_rate NUMERIC(5,2), -- 해당 지역 평균 낙찰률
  
  -- 시계열 파생 변수
  recent_3month_avg_rate NUMERIC(5,2), -- 최근 3개월 평균
  recent_6month_avg_rate NUMERIC(5,2), -- 최근 6개월 평균
  trend_direction TEXT, -- 추세 방향 (UP/DOWN/STABLE)
  
  -- 메타
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) bid_recommendations: 추천 투찰가 결과 (캐시)
CREATE TABLE IF NOT EXISTS bid_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  
  -- 추천 투찰가 (3가지)
  conservative_rate NUMERIC(5,2), -- 보수적 (75th percentile)
  conservative_amount NUMERIC(15,2),
  conservative_confidence TEXT, -- HIGH/MEDIUM/LOW
  
  standard_rate NUMERIC(5,2), -- 기준 (median)
  standard_amount NUMERIC(15,2),
  standard_confidence TEXT,
  
  aggressive_rate NUMERIC(5,2), -- 공격적 (25th percentile)
  aggressive_amount NUMERIC(15,2),
  aggressive_confidence TEXT,
  
  -- 분석 메타데이터
  similar_bids_count INT DEFAULT 0, -- 유사 사례 수
  analysis_period_months INT DEFAULT 12, -- 분석 기간 (개월)
  data_quality_score NUMERIC(3,2), -- 데이터 품질 점수 (0-1)
  
  -- 경고 및 설명
  warnings JSONB, -- 경고 메시지 배열
  explanation JSONB, -- 추천 근거 설명
  
  -- 메타
  recommended_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tender_id) -- 1 공고 = 1 추천 결과
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- bid_notices 인덱스
CREATE INDEX idx_bid_notices_tender_id ON bid_notices(tender_id);
CREATE INDEX idx_bid_notices_source_id ON bid_notices(source_bid_notice_id);
CREATE INDEX idx_bid_notices_opened_at ON bid_notices(open_datetime);
CREATE INDEX idx_bid_notices_industry ON bid_notices(industry_code);
CREATE INDEX idx_bid_notices_region ON bid_notices(region_code);
CREATE INDEX idx_bid_notices_contract_type ON bid_notices(contract_type);
CREATE INDEX idx_bid_notices_demand_org ON bid_notices(demand_organization);

-- bid_open_results 인덱스
CREATE INDEX idx_bid_open_results_notice_id ON bid_open_results(bid_notice_id);
CREATE INDEX idx_bid_open_results_opened_at ON bid_open_results(opened_at);
CREATE INDEX idx_bid_open_results_success ON bid_open_results(is_successful);

-- bid_awards 인덱스
CREATE INDEX idx_bid_awards_notice_id ON bid_awards(bid_notice_id);
CREATE INDEX idx_bid_awards_winner ON bid_awards(winner_company_name);
CREATE INDEX idx_bid_awards_rate ON bid_awards(winner_bid_rate);
CREATE INDEX idx_bid_awards_awarded_at ON bid_awards(awarded_at);

-- bid_price_features 인덱스
CREATE INDEX idx_bid_price_features_notice_id ON bid_price_features(bid_notice_id);

-- bid_recommendations 인덱스
CREATE INDEX idx_bid_recommendations_tender_id ON bid_recommendations(tender_id);
CREATE INDEX idx_bid_recommendations_expires_at ON bid_recommendations(expires_at);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- bid_notices: 전체 공개 읽기
ALTER TABLE bid_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bid_notices 공개 읽기" ON bid_notices FOR SELECT USING (true);

-- bid_open_results: 전체 공개 읽기
ALTER TABLE bid_open_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bid_open_results 공개 읽기" ON bid_open_results FOR SELECT USING (true);

-- bid_awards: 전체 공개 읽기
ALTER TABLE bid_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bid_awards 공개 읽기" ON bid_awards FOR SELECT USING (true);

-- bid_price_features: 전체 공개 읽기
ALTER TABLE bid_price_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bid_price_features 공개 읽기" ON bid_price_features FOR SELECT USING (true);

-- bid_recommendations: 전체 공개 읽기
ALTER TABLE bid_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bid_recommendations 공개 읽기" ON bid_recommendations FOR SELECT USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at 자동 업데이트 트리거 (이미 존재하는 함수 활용)
CREATE TRIGGER update_bid_notices_updated_at BEFORE UPDATE ON bid_notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bid_open_results_updated_at BEFORE UPDATE ON bid_open_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bid_awards_updated_at BEFORE UPDATE ON bid_awards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bid_price_features_updated_at BEFORE UPDATE ON bid_price_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE bid_notices IS '입찰 공고 기본 정보 (나라장터 원본 데이터)';
COMMENT ON TABLE bid_open_results IS '개찰 결과 정보';
COMMENT ON TABLE bid_awards IS '최종 낙찰 결과';
COMMENT ON TABLE bid_price_features IS '분석용 파생 변수 (가격, 시장, 시계열)';
COMMENT ON TABLE bid_recommendations IS '투찰가 추천 결과 캐시 (24시간 유효)';

-- ============================================================================
-- ANALYSIS FUNCTIONS (Phase 1 - Basic)
-- ============================================================================

-- 유사 낙찰 사례 검색 함수
CREATE OR REPLACE FUNCTION get_similar_bids(
  target_tender_id UUID,
  similarity_weights JSONB DEFAULT '{"agency": 0.3, "industry": 0.3, "region": 0.2, "budget": 0.2}'::jsonb,
  max_results INT DEFAULT 20,
  months_back INT DEFAULT 12
)
RETURNS TABLE (
  bid_notice_id UUID,
  similarity_score NUMERIC,
  notice_name TEXT,
  demand_organization TEXT,
  winner_bid_rate NUMERIC,
  winner_bid_amount NUMERIC,
  total_bidders INT,
  awarded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_agency TEXT;
  target_industry TEXT;
  target_region TEXT;
  target_budget NUMERIC;
BEGIN
  -- 대상 공고 정보 조회
  SELECT 
    demand_agency_name,
    industry_code,
    region_code,
    budget_amount
  INTO 
    target_agency,
    target_industry,
    target_region,
    target_budget
  FROM public.tenders
  WHERE id = target_tender_id;
  
  -- 유사도 점수 계산 및 검색
  RETURN QUERY
  SELECT
    bn.id AS bid_notice_id,
    (
      -- 기관 일치 (30%)
      CASE WHEN bn.demand_organization = target_agency THEN (similarity_weights->>'agency')::numeric ELSE 0 END +
      -- 업종 일치 (30%)
      CASE WHEN bn.industry_code = target_industry THEN (similarity_weights->>'industry')::numeric ELSE 0 END +
      -- 지역 일치 (20%)
      CASE WHEN bn.region_code = target_region THEN (similarity_weights->>'region')::numeric ELSE 0 END +
      -- 예산 유사도 (20%) - ±30% 범위
      CASE 
        WHEN target_budget IS NULL OR bn.estimated_price IS NULL THEN 0
        WHEN bn.estimated_price BETWEEN target_budget * 0.7 AND target_budget * 1.3 
        THEN (similarity_weights->>'budget')::numeric
        ELSE 0
      END
    ) AS similarity_score,
    bn.notice_name,
    bn.demand_organization,
    ba.winner_bid_rate,
    ba.winner_bid_amount,
    bor.total_bidders,
    ba.awarded_at
  FROM bid_notices bn
  INNER JOIN bid_awards ba ON bn.id = ba.bid_notice_id
  INNER JOIN bid_open_results bor ON bn.id = bor.bid_notice_id
  WHERE 
    -- 최근 N개월 이내
    ba.awarded_at >= NOW() - INTERVAL '1 month' * months_back
    -- 낙찰 성공
    AND ba.is_final = TRUE
    AND bor.is_successful = TRUE
    -- 자기 자신 제외
    AND bn.tender_id != target_tender_id
  ORDER BY similarity_score DESC, ba.awarded_at DESC
  LIMIT max_results;
END;
$$;

COMMENT ON FUNCTION get_similar_bids IS '유사 낙찰 사례 검색: 기관, 업종, 지역, 예산 기반 유사도 계산';

-- 낙찰률 통계 계산 함수
CREATE OR REPLACE FUNCTION calculate_bid_rate_stats(
  similar_bid_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  rates NUMERIC[];
BEGIN
  -- 낙찰률 배열 수집
  SELECT ARRAY_AGG(ba.winner_bid_rate ORDER BY ba.winner_bid_rate)
  INTO rates
  FROM bid_awards ba
  WHERE ba.bid_notice_id = ANY(similar_bid_ids);
  
  -- 통계 계산
  SELECT jsonb_build_object(
    'count', COALESCE(ARRAY_LENGTH(rates, 1), 0),
    'min', (SELECT MIN(val) FROM UNNEST(rates) val),
    'max', (SELECT MAX(val) FROM UNNEST(rates) val),
    'mean', (SELECT AVG(val) FROM UNNEST(rates) val),
    'p25', (SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY val) FROM UNNEST(rates) val),
    'median', (SELECT PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val) FROM UNNEST(rates) val),
    'p75', (SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY val) FROM UNNEST(rates) val),
    'p90', (SELECT PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val) FROM UNNEST(rates) val),
    'stddev', (SELECT STDDEV(val) FROM UNNEST(rates) val)
  )
  INTO result;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION calculate_bid_rate_stats IS '낙찰률 통계 계산: 분위수, 평균, 표준편차';

-- 투찰가 추천 함수
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
  result JSONB;
  similar_count INT;
  data_quality NUMERIC;
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
    
    -- 공격적 전략 (낮은 낙찰률 - 리스크 높지만 수익성 높음)
    'aggressive', jsonb_build_object(
      'rate', stats->>'p25',
      'amount', ROUND(estimated_price * (stats->>'p25')::numeric / 100, 0),
      'confidence', CASE 
        WHEN similar_count >= 15 THEN 'MEDIUM'
        WHEN similar_count >= 8 THEN 'LOW'
        ELSE 'VERY_LOW'
      END,
      'description', '수익성 높음 (25th percentile), 낙찰 확률 낮음'
    ),
    
    -- 메타 정보
    'metadata', jsonb_build_object(
      'similar_count', similar_count,
      'analysis_months', analysis_months,
      'data_quality', ROUND(data_quality, 2),
      'stats', stats
    ),
    
    -- 경고
    'warnings', CASE
      WHEN similar_count < 10 THEN jsonb_build_array('유사 사례가 10건 미만입니다')
      WHEN (stats->>'stddev')::numeric > 10 THEN jsonb_build_array('낙찰률 변동성이 큽니다')
      ELSE '[]'::jsonb
    END
  );
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION recommend_bid_price IS '투찰가 추천: 보수적/기준/공격적 3가지 전략 제시';
