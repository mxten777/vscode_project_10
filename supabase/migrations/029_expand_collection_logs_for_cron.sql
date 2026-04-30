-- ================================================================
-- Migration 029: Expand collection_logs job types for cron monitoring
-- 목적:
--   실제 운영 cron job 들(alerts, participants, cleanup, analysis rebuild 등)이
--   collection_logs 에 안전하게 기록될 수 있도록 허용 범위를 확장한다.
-- ================================================================

ALTER TABLE public.collection_logs
  DROP CONSTRAINT IF EXISTS collection_logs_job_type_check;

ALTER TABLE public.collection_logs
  ADD CONSTRAINT collection_logs_job_type_check
  CHECK (
    job_type IN (
      'tenders',
      'awards',
      'backfill_awards',
      'analysis_rebuild',
      'alerts',
      'participants',
      'cleanup'
    )
  );

COMMENT ON COLUMN public.collection_logs.job_type IS
  'tenders, awards, backfill_awards, analysis_rebuild, alerts, participants, cleanup cron job types';