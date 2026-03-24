-- ============================================================================
-- 낙찰 분석 대시보드 데모 데이터 시드
-- 실행 방법: Supabase Dashboard → SQL Editor → 이 파일 내용 붙여넣기 → Run
--
-- 주의사항:
--   1. Migration 006~009가 먼저 적용되어 있어야 합니다.
--   2. 이 스크립트는 멱등(idempotent)합니다 — 중복 실행해도 안전합니다.
--   3. 기존 SEED-xxx 데이터를 삭제 후 재삽입합니다.
-- ============================================================================

-- 기존 시드 데이터 초기화 (재실행 안전)
DELETE FROM bid_awards
  WHERE bid_notice_id IN (
    SELECT id FROM bid_notices WHERE source_bid_notice_id LIKE 'SEED-%'
  );
DELETE FROM bid_open_results
  WHERE bid_notice_id IN (
    SELECT id FROM bid_notices WHERE source_bid_notice_id LIKE 'SEED-%'
  );
DELETE FROM bid_notices WHERE source_bid_notice_id LIKE 'SEED-%';

-- ============================================================================
-- 데모 데이터 생성 (60건 × 최근 12개월)
-- ============================================================================
DO $$
DECLARE
  -- 발주기관 (15개)
  agencies    TEXT[] := ARRAY[
    '조달청','국방부','행정안전부','서울특별시청','경기도청',
    '부산광역시청','국토교통부','과학기술정보통신부','교육부','보건복지부',
    '한국정보화진흥원','중소벤처기업부','환경부','한국전자통신연구원','인천광역시청'
  ];
  -- 업종 (8개)
  ind_names   TEXT[] := ARRAY[
    '소프트웨어 개발','정보시스템 구축','정보보안','정보통신공사',
    '용역·서비스','빅데이터·AI','건설','시설관리'
  ];
  ind_codes   TEXT[] := ARRAY[
    'C001','C002','C003','C004','C005','C006','C007','C008'
  ];
  -- 지역 (8개)
  reg_names   TEXT[] := ARRAY[
    '서울','경기','부산','대구','인천','광주','대전','울산'
  ];
  reg_codes   TEXT[] := ARRAY[
    '11','41','26','27','28','29','30','31'
  ];
  -- 계약방법 (3개)
  ctypes      TEXT[] := ARRAY['일반경쟁','제한경쟁','지명경쟁'];
  -- 낙찰 업체 (15개)
  companies   TEXT[] := ARRAY[
    '삼성SDS(주)','LG CNS(주)','SK(주) C&C','한화시스템(주)','KT(주)',
    '현대정보기술(주)','롯데정보통신(주)','포스코ICT(주)','(주)KTDS','신한데이터시스템(주)',
    '(주)LG유플러스','현대오토에버(주)','(주)대우정보시스템','이지스엔터프라이즈(주)','(주)투비소프트'
  ];
  -- 공고명 템플릿
  titles      TEXT[] := ARRAY[
    ' 시스템 구축 사업', ' 운영 용역', ' 인프라 고도화', ' 플랫폼 개발',
    ' 유지보수 용역', ' 클라우드 전환', ' 보안강화 사업', ' 스마트화 사업'
  ];

  notice_id   UUID;
  i           INT;
  a_idx       INT;
  ind_idx     INT;
  reg_idx     INT;
  ct_idx      INT;
  co_idx      INT;
  ti_idx      INT;
  base_amt    NUMERIC;
  open_dt     TIMESTAMPTZ;
  bid_rate    NUMERIC;
  bidders     INT;
  low_limit   NUMERIC;
BEGIN
  FOR i IN 1..60 LOOP
    -- 인덱스 결정 (소수 기반으로 분산)
    a_idx   := 1 + ((i * 7  + 3)  % 15);
    ind_idx := 1 + ((i * 11 + 5)  % 8);
    reg_idx := 1 + ((i * 13 + 2)  % 8);
    ct_idx  := 1 + ((i * 3  + 1)  % 3);
    co_idx  := 1 + ((i * 17 + 7)  % 15);
    ti_idx  := 1 + ((i * 5  + 4)  % 8);

    -- 예정가격: 3억 ~ 130억 (건당)
    base_amt := (3 + ((i * 19 + i * i) % 127)) * 100000000.0;

    -- 개찰일시: 최근 12개월 내 균등 분산 (오래된 것부터)
    open_dt := (NOW() - ((365 - ((i - 1) * 6)) || ' days')::INTERVAL)::TIMESTAMPTZ;

    -- 낙찰률: 85.00 ~ 98.00% (현실적 범위)
    bid_rate := 85.0 + ((i * 31 + 47) % 1301) / 100.0;

    -- 낙찰하한율: 87.745 % 고정 (표준 하한율)
    low_limit := 87.745;

    -- 참여 업체 수: 3~28개
    bidders := 3 + ((i * 7 + 9) % 26);

    -- bid_notices 삽입
    INSERT INTO bid_notices (
      source_bid_notice_id,
      notice_number,
      notice_name,
      demand_organization,
      contract_type,
      estimated_price,
      lower_limit_rate,
      open_datetime,
      industry_code,
      industry_name,
      region_code,
      region_name,
      base_amount
    ) VALUES (
      'SEED-' || LPAD(i::TEXT, 3, '0') || '-00',
      '20250' || LPAD(i::TEXT, 7, '0'),
      agencies[a_idx] || ' ' || ind_names[ind_idx] || titles[ti_idx],
      agencies[a_idx],
      ctypes[ct_idx],
      base_amt,
      low_limit,
      open_dt,
      ind_codes[ind_idx],
      ind_names[ind_idx],
      reg_codes[reg_idx],
      reg_names[reg_idx],
      base_amt * 1.03  -- 기초금액 = 예정가 × 1.03 (근사)
    ) RETURNING id INTO notice_id;

    -- bid_open_results 삽입
    INSERT INTO bid_open_results (
      bid_notice_id,
      opened_at,
      total_bidders,
      valid_bidders,
      highest_bid_rate,
      lowest_bid_rate,
      average_bid_rate,
      median_bid_rate,
      expected_winner_company,
      expected_winner_bid_rate,
      expected_winner_amount,
      is_successful
    ) VALUES (
      notice_id,
      open_dt,
      bidders,
      GREATEST(bidders - (i % 3), 1),
      LEAST(bid_rate + 3.0 + ((i * 7) % 300) / 100.0, 99.99),
      GREATEST(bid_rate - 3.0 - ((i * 5) % 200) / 100.0, 80.0),
      bid_rate + 0.5,
      bid_rate + 0.1,
      companies[co_idx],
      bid_rate,
      ROUND(base_amt * bid_rate / 100.0),
      TRUE
    );

    -- bid_awards 삽입
    INSERT INTO bid_awards (
      bid_notice_id,
      winner_company_name,
      winner_business_number,
      winner_bid_rate,
      winner_bid_amount,
      contract_amount,
      contract_type,
      awarded_at,
      is_final
    ) VALUES (
      notice_id,
      companies[co_idx],
      LPAD(((i::BIGINT * 987654321) % 1000000000)::TEXT, 10, '0'),
      bid_rate,
      ROUND(base_amt * bid_rate / 100.0),
      ROUND(base_amt * bid_rate / 100.0),
      ctypes[ct_idx],
      open_dt,
      TRUE
    );

  END LOOP;

  RAISE NOTICE '✅ 낙찰 데모 데이터 60건 삽입 완료';
END $$;

-- ============================================================================
-- 결과 확인
-- ============================================================================
SELECT
  '📋 bid_notices'  AS 테이블,
  COUNT(*)          AS 건수
FROM bid_notices WHERE source_bid_notice_id LIKE 'SEED-%'
UNION ALL
SELECT
  '📊 bid_open_results',
  COUNT(*)
FROM bid_open_results
WHERE bid_notice_id IN (SELECT id FROM bid_notices WHERE source_bid_notice_id LIKE 'SEED-%')
UNION ALL
SELECT
  '🏆 bid_awards',
  COUNT(*)
FROM bid_awards
WHERE bid_notice_id IN (SELECT id FROM bid_notices WHERE source_bid_notice_id LIKE 'SEED-%');
