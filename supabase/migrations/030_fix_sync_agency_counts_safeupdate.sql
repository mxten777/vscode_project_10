-- ================================================================
-- Migration 030: Make sync_agency_counts compatible with safe-update
-- 목적:
--   일부 Supabase 환경에서 WHERE 없는 UPDATE 가 차단되어
--   rebuild_all_analysis() -> sync_agency_counts() 가 실패한다.
--   전체 행 갱신 의도를 유지하면서 safe-update 요구사항을 만족시킨다.
-- ================================================================

CREATE OR REPLACE FUNCTION public.sync_agency_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated int := 0;
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
    )
  WHERE ag.id IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'completed_at', NOW()
  );
END;
$$;