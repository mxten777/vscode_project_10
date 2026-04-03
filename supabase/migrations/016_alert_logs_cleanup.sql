-- ================================================================
-- Migration 016: alert_logs + collection_logs TTL Cleanup
-- 목적:
--   무한 누적되는 알림 로그와 수집 이력 로그에 90일 보존 정책 적용.
--   Vercel Cron에서 주기적으로 호출할 수 있는 cleanup 함수 제공.
-- ================================================================

-- 1. alert_logs 90일 보존 cleanup 함수
CREATE OR REPLACE FUNCTION public.cleanup_old_alert_logs(
  retention_days int DEFAULT 90
)
RETURNS TABLE(deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt bigint;
BEGIN
  DELETE FROM public.alert_logs
  WHERE sent_at < NOW() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN QUERY SELECT cnt;
END;
$$;

-- 2. collection_logs 90일 보존 cleanup 함수
CREATE OR REPLACE FUNCTION public.cleanup_old_collection_logs(
  retention_days int DEFAULT 90
)
RETURNS TABLE(deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt bigint;
BEGIN
  DELETE FROM public.collection_logs
  WHERE created_at < NOW() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN QUERY SELECT cnt;
END;
$$;

-- 3. 통합 cleanup 함수 (Cron에서 1회 호출로 전체 처리)
CREATE OR REPLACE FUNCTION public.run_cleanup_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_deleted  bigint;
  collect_deleted bigint;
BEGIN
  SELECT deleted_count INTO alert_deleted   FROM cleanup_old_alert_logs(90);
  SELECT deleted_count INTO collect_deleted FROM cleanup_old_collection_logs(90);

  RETURN jsonb_build_object(
    'alert_logs_deleted',      alert_deleted,
    'collection_logs_deleted', collect_deleted,
    'ran_at',                  NOW()
  );
END;
$$;

-- 4. 권한 부여 (서비스 롤에서 직접 호출)
GRANT EXECUTE ON FUNCTION public.cleanup_old_alert_logs(int)     TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_collection_logs(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_cleanup_jobs()              TO service_role;

COMMENT ON FUNCTION public.run_cleanup_jobs() IS '알림 로그 + 수집 이력 90일 이전 데이터 정리. Vercel Cron에서 주간 호출 권장.';
