-- ================================================================
-- Migration 019: 만료 공고 자동 CLOSED 처리
-- 목적:
--   poll-tenders 크론은 공고일 기준 7일 이내 신규 공고만 수집하므로
--   7일 이상 된 공고는 deadline_at이 지나도 status가 OPEN으로 남는다.
--   이를 해소하기 위해 주기적으로 deadline_at < NOW()인 OPEN 공고를
--   CLOSED로 일괄 갱신하는 함수를 추가하고 run_cleanup_jobs()에 통합한다.
-- ================================================================

-- 1. 만료 공고 CLOSED 갱신 함수
CREATE OR REPLACE FUNCTION public.close_expired_tenders()
RETURNS TABLE(closed_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt bigint;
BEGIN
  UPDATE public.tenders
  SET
    status     = 'CLOSED',
    updated_at = NOW()
  WHERE
    status     = 'OPEN'
    AND deadline_at IS NOT NULL
    AND deadline_at < NOW();

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN QUERY SELECT cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_expired_tenders() TO service_role;

COMMENT ON FUNCTION public.close_expired_tenders() IS
  'deadline_at이 현재 시각보다 이전인 OPEN 공고를 CLOSED로 일괄 갱신. '
  'run_cleanup_jobs() 내에서 주간 실행 권장.';

-- 2. run_cleanup_jobs()에 만료 공고 처리 통합
CREATE OR REPLACE FUNCTION public.run_cleanup_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_deleted    bigint;
  collect_deleted  bigint;
  tenders_closed   bigint;
BEGIN
  SELECT deleted_count INTO alert_deleted   FROM cleanup_old_alert_logs(90);
  SELECT deleted_count INTO collect_deleted FROM cleanup_old_collection_logs(90);
  SELECT closed_count  INTO tenders_closed  FROM close_expired_tenders();

  RETURN jsonb_build_object(
    'alert_logs_deleted',      alert_deleted,
    'collection_logs_deleted', collect_deleted,
    'tenders_closed',          tenders_closed,
    'ran_at',                  NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_cleanup_jobs() TO service_role;

COMMENT ON FUNCTION public.run_cleanup_jobs() IS
  '알림 로그 + 수집 이력 90일 이전 데이터 정리, 만료 공고 CLOSED 처리. '
  'Vercel Cron에서 주간 호출 권장 (매주 일요일 10:00 KST).';
