-- ================================================================
-- Migration 012: 수집 이력 테이블 (collection_logs)
-- 목적:
--   나라장터 API 수집 작업의 시작/완료/실패 상태를 기록하고
--   페이지네이션 재시작 지점을 보존하여 수집 신뢰성 확보
-- ================================================================

-- 수집 이력 테이블
CREATE TABLE IF NOT EXISTS collection_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type          text        NOT NULL CHECK (job_type IN ('tenders', 'awards')),
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  status            text        CHECK (status IN ('running', 'success', 'partial', 'failed')),
  records_collected int         NOT NULL DEFAULT 0,
  last_page_no      int         NOT NULL DEFAULT 1,  -- 마지막으로 처리한 페이지 (재시작 지점)
  total_pages       int,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 최근 수집 이력 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_collection_logs_job_started
  ON collection_logs (job_type, started_at DESC);

-- 진행 중인 작업 빠른 탐색
CREATE INDEX IF NOT EXISTS idx_collection_logs_status
  ON collection_logs (status)
  WHERE status = 'running';

-- RLS: 서비스 롤만 접근 (일반 사용자 비공개)
ALTER TABLE collection_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 롤(Cron Job)은 전체 권한
CREATE POLICY "service_role_full_access_collection_logs"
  ON collection_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 헬스체크 겸 관리자 조회용: 인증된 조직 admin만 읽기 허용
CREATE POLICY "admin_read_collection_logs"
  ON collection_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
    )
  );

-- 오래된 수집 로그 정리 함수 (90일 보존)
CREATE OR REPLACE FUNCTION cleanup_old_collection_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM collection_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
$$;

COMMENT ON TABLE collection_logs IS '나라장터 API 수집 작업 이력. Cron Job 실행 결과 및 재시작 지점 보존.';
COMMENT ON COLUMN collection_logs.job_type IS '''tenders'' = 공고 수집, ''awards'' = 낙찰정보 수집';
COMMENT ON COLUMN collection_logs.last_page_no IS '마지막으로 처리 완료한 페이지 번호 (실패 시 재시작 지점)';
COMMENT ON COLUMN collection_logs.status IS '''running'' → 진행중, ''success'' → 완료, ''partial'' → 일부성공, ''failed'' → 실패';
