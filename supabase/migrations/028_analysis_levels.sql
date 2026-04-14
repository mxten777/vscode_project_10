-- ============================================================================
-- Migration 028: 3단계 분석 구조 (analysis_level)
--
-- 레벨 1: 전체 기본 (모든 공고)
-- 레벨 2: 후보군 (마감 7일 이내 / 예산 1억+ / AI 추천 상위)
-- 레벨 3: 정밀 분석 (즐겨찾기 / 사용자 요청 / bid_participants 완료)
-- ============================================================================

-- 1. tenders에 analysis_level 추가
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS analysis_level int DEFAULT 1
    CHECK (analysis_level IN (1, 2, 3));

ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS participants_collected boolean DEFAULT false;

ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS participants_collected_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tenders_analysis_level
  ON public.tenders (analysis_level, status);

CREATE INDEX IF NOT EXISTS idx_tenders_participants_collected
  ON public.tenders (participants_collected)
  WHERE participants_collected = false AND status IN ('OPEN', 'CLOSED');

-- 2. analysis_level 자동 계산 함수
--    레벨은 주기적으로 재계산 (rebuild-analysis cron에서 호출)
CREATE OR REPLACE FUNCTION compute_analysis_levels()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_ts    timestamptz := now();
  upgraded2 int := 0;
  upgraded3 int := 0;
BEGIN
  -- ── 레벨 2: 후보군 ─────────────────────────────────────────────────────
  -- 조건: OPEN + (마감 7일 이내 OR 예산 1억 이상)
  --       또는 CLOSED/RESULT + awards 존재
  UPDATE public.tenders
  SET analysis_level = 2
  WHERE analysis_level = 1
    AND (
      (
        status = 'OPEN'
        AND (
          (deadline_at IS NOT NULL AND deadline_at <= now_ts + INTERVAL '7 days')
          OR (budget_amount IS NOT NULL AND budget_amount >= 100000000)
        )
      )
      OR (
        status IN ('CLOSED', 'RESULT')
        AND EXISTS (
          SELECT 1 FROM public.awards a WHERE a.tender_id = tenders.id LIMIT 1
        )
      )
    );
  GET DIAGNOSTICS upgraded2 = ROW_COUNT;

  -- ── 레벨 3: 정밀 분석 ──────────────────────────────────────────────────
  -- 조건: bid_participants 수집 완료 OR 즐겨찾기 등록된 공고
  UPDATE public.tenders t
  SET analysis_level = 3
  WHERE t.analysis_level < 3
    AND (
      t.participants_collected = true
      OR EXISTS (
        SELECT 1 FROM public.favorites f WHERE f.tender_id = t.id LIMIT 1
      )
    );
  GET DIAGNOSTICS upgraded3 = ROW_COUNT;

  RETURN jsonb_build_object(
    'upgraded_to_level2', upgraded2,
    'upgraded_to_level3', upgraded3,
    'computed_at', now_ts
  );
END;
$$;

-- 3. 즐겨찾기 추가 시 analysis_level 자동 업그레이드 트리거
CREATE OR REPLACE FUNCTION trg_favorite_upgrade_analysis_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenders
  SET analysis_level = GREATEST(analysis_level, 3)
  WHERE id = NEW.tender_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_favorites_analysis_level ON public.favorites;
CREATE TRIGGER trg_favorites_analysis_level
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION trg_favorite_upgrade_analysis_level();

-- 4. 최초 일괄 계산 실행
SELECT compute_analysis_levels();
