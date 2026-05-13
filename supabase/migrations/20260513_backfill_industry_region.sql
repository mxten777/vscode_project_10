-- ============================================================
-- 기존 공고 업종/지역 소급 처리
-- 배경: 기존 22k 레코드는 getBidPblancListInfoServc(용역) 엔드포인트만으로
--       수집되었으므로 industry_code/name이 NULL.
--       이 마이그레이션에서 업종은 '용역'으로, 지역은 기관명 파싱으로 채운다.
-- ============================================================

-- 1. 업종 소급 (기존 NULL 레코드 전부 → 용역)
UPDATE public.tenders
SET
  industry_code = 'SVC',
  industry_name = '용역',
  updated_at    = now()
WHERE industry_code IS NULL;

-- 2. 지역 소급 (demand_agency_name 기반 텍스트 파싱)
UPDATE public.tenders
SET
  region_code = CASE
    WHEN demand_agency_name LIKE '%서울%'                           THEN '11'
    WHEN demand_agency_name LIKE '%부산%'                           THEN '26'
    WHEN demand_agency_name LIKE '%대구%'                           THEN '27'
    WHEN demand_agency_name LIKE '%인천%'                           THEN '28'
    WHEN demand_agency_name LIKE '%광주%'                           THEN '29'
    WHEN demand_agency_name LIKE '%대전%'                           THEN '30'
    WHEN demand_agency_name LIKE '%울산%'                           THEN '31'
    WHEN demand_agency_name LIKE '%세종%'                           THEN '36'
    WHEN demand_agency_name LIKE '%경기%'                           THEN '41'
    WHEN demand_agency_name LIKE '%강원%'                           THEN '42'
    WHEN demand_agency_name LIKE '%충북%' OR demand_agency_name LIKE '%충청북도%' THEN '43'
    WHEN demand_agency_name LIKE '%충남%' OR demand_agency_name LIKE '%충청남도%' THEN '44'
    WHEN demand_agency_name LIKE '%전북%' OR demand_agency_name LIKE '%전라북도%' THEN '45'
    WHEN demand_agency_name LIKE '%전남%' OR demand_agency_name LIKE '%전라남도%' THEN '46'
    WHEN demand_agency_name LIKE '%경북%' OR demand_agency_name LIKE '%경상북도%' THEN '47'
    WHEN demand_agency_name LIKE '%경남%' OR demand_agency_name LIKE '%경상남도%' THEN '48'
    WHEN demand_agency_name LIKE '%제주%'                           THEN '50'
    ELSE NULL
  END,
  region_name = CASE
    WHEN demand_agency_name LIKE '%서울%'                           THEN '서울'
    WHEN demand_agency_name LIKE '%부산%'                           THEN '부산'
    WHEN demand_agency_name LIKE '%대구%'                           THEN '대구'
    WHEN demand_agency_name LIKE '%인천%'                           THEN '인천'
    WHEN demand_agency_name LIKE '%광주%'                           THEN '광주'
    WHEN demand_agency_name LIKE '%대전%'                           THEN '대전'
    WHEN demand_agency_name LIKE '%울산%'                           THEN '울산'
    WHEN demand_agency_name LIKE '%세종%'                           THEN '세종'
    WHEN demand_agency_name LIKE '%경기%'                           THEN '경기'
    WHEN demand_agency_name LIKE '%강원%'                           THEN '강원'
    WHEN demand_agency_name LIKE '%충북%' OR demand_agency_name LIKE '%충청북도%' THEN '충북'
    WHEN demand_agency_name LIKE '%충남%' OR demand_agency_name LIKE '%충청남도%' THEN '충남'
    WHEN demand_agency_name LIKE '%전북%' OR demand_agency_name LIKE '%전라북도%' THEN '전북'
    WHEN demand_agency_name LIKE '%전남%' OR demand_agency_name LIKE '%전라남도%' THEN '전남'
    WHEN demand_agency_name LIKE '%경북%' OR demand_agency_name LIKE '%경상북도%' THEN '경북'
    WHEN demand_agency_name LIKE '%경남%' OR demand_agency_name LIKE '%경상남도%' THEN '경남'
    WHEN demand_agency_name LIKE '%제주%'                           THEN '제주'
    ELSE NULL
  END,
  updated_at = now()
WHERE region_code IS NULL
  AND demand_agency_name IS NOT NULL;

-- 결과 확인용
SELECT
  COUNT(*)                                               AS total,
  COUNT(*) FILTER (WHERE industry_code IS NOT NULL)     AS industry_filled,
  COUNT(*) FILTER (WHERE region_code   IS NOT NULL)     AS region_filled,
  COUNT(*) FILTER (WHERE region_code   IS NULL)         AS region_still_null
FROM public.tenders;
