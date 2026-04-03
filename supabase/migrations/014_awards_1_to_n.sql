-- ================================================================
-- Migration 014: awards 테이블 1:1 → 1:N 구조 변경
-- 목적:
--   현재 awards.tender_id UNIQUE 제약으로 공동수급/부분낙찰/재입찰
--   데이터를 저장할 수 없음. (tender_id, bidder_registration_no) 복합
--   UNIQUE로 교체하여 1개 공고에 대해 여러 낙찰 기록 허용.
-- 주의:
--   기존 데이터 보존 후 구조 변경. 프로덕션 배포 시 유지보수 창(window)
--   또는 다운타임 최소화 방식(CONCURRENTLY) 사용 권장.
-- ================================================================

-- 1. awards 테이블에 낙찰 식별에 필요한 컬럼 추가
ALTER TABLE public.awards
  ADD COLUMN IF NOT EXISTS bidder_registration_no text,   -- 낙찰자 사업자등록번호 (복합 UNIQUE키로 사용)
  ADD COLUMN IF NOT EXISTS bidder_company_name     text,   -- 낙찰자 상호 (기존 winner_company_name 중복 허용)
  ADD COLUMN IF NOT EXISTS award_type              text    -- 'single'|'joint'|'partial'|'rebid'
    CHECK (award_type IN ('single', 'joint', 'partial', 'rebid') OR award_type IS NULL),
  ADD COLUMN IF NOT EXISTS sequence_no             int     -- 공동수급 시 순번
    DEFAULT 1;

-- 2. 기존 UNIQUE 제약 제거 (tender_id 단독 UNIQUE)
ALTER TABLE public.awards
  DROP CONSTRAINT IF EXISTS awards_tender_id_key;

-- 3. 복합 UNIQUE 인덱스 추가
--    bidder_registration_no NULL이 가능하므로 NULLS NOT DISTINCT 사용
--    (NULL도 동일 값 취급 → 동일 공고에 사업자 미상 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_awards_tender_bidder_unique
  ON public.awards (tender_id, bidder_registration_no, sequence_no)
  NULLS NOT DISTINCT;

-- 4. 기존 데이터에 award_type 기본값 설정
UPDATE public.awards
  SET award_type = 'single'
  WHERE award_type IS NULL;

-- 5. 성능 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_awards_tender_id
  ON public.awards (tender_id);

CREATE INDEX IF NOT EXISTS idx_awards_opened_at
  ON public.awards (opened_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_awards_awarded_rate
  ON public.awards (awarded_rate)
  WHERE awarded_rate IS NOT NULL;

-- 6. 컬럼 코멘트
COMMENT ON COLUMN public.awards.bidder_registration_no IS '낙찰자 사업자등록번호. 복합 UNIQUE의 핵심 키.';
COMMENT ON COLUMN public.awards.award_type IS 'single=단독낙찰, joint=공동수급, partial=부분낙찰, rebid=재입찰';
COMMENT ON COLUMN public.awards.sequence_no IS '공동수급 시 업체 순번 (주간사=1)';

-- ================================================================
-- 검증 쿼리
-- ================================================================
-- SELECT COUNT(*) FROM awards;
-- SELECT tender_id, COUNT(*) FROM awards GROUP BY tender_id HAVING COUNT(*) > 1;
