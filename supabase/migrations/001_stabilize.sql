-- ============================================================
-- Migration 001: 안정화 패치 (PR#1)
-- 작성일: 2026-03-02
-- 설명: alert_logs 중복 방지 제약, alert_rules 이름 컬럼,
--       누락 인덱스 추가
-- 실행: Supabase Dashboard > SQL Editor 에서 붙여넣기 후 실행
-- ============================================================

-- 1. alert_logs 중복 알림 방지 UNIQUE 제약 ──────────────────
--    동일 (rule, tender) 쌍에 대한 중복 발송을 DB 레벨에서 차단
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'alert_logs'
      AND constraint_name = 'uq_alert_logs_rule_tender'
  ) THEN
    ALTER TABLE public.alert_logs
      ADD CONSTRAINT uq_alert_logs_rule_tender
      UNIQUE (alert_rule_id, tender_id);
  END IF;
END $$;

-- 2. alert_rules 이름 컬럼 추가 ───────────────────────────
--    UI에서 규칙 이름 입력·표시를 위한 컬럼 (기존 데이터 NULL 허용)
ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS name text;

-- 3. tenders.created_at 인덱스 ────────────────────────────
--    process-alerts에서 "최근 15분 신규 공고" 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_tenders_created_at
  ON public.tenders (created_at DESC);

-- 4. alert_logs 복합 인덱스 ───────────────────────────────
--    (alert_rule_id, tender_id) 중복 체크 쿼리 최적화
--    (UNIQUE 제약으로 이미 인덱스가 생성되지만 명시적 이름 부여)
CREATE INDEX IF NOT EXISTS idx_alert_logs_rule_tender
  ON public.alert_logs (alert_rule_id, tender_id);

-- 5. tenders 복합 인덱스 (OPEN 상태 마감 필터) ──────────────
--    메인 대시보드 "진행중 + 마감일 정렬" 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_tenders_open_deadline
  ON public.tenders (deadline_at)
  WHERE status = 'OPEN';

-- ============================================================
-- 검증 쿼리 (실행 후 확인)
-- ============================================================
-- SELECT constraint_name FROM information_schema.table_constraints
--   WHERE table_name = 'alert_logs' AND constraint_type = 'UNIQUE';
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'alert_rules' AND column_name = 'name';
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'tenders'
--   AND indexname LIKE 'idx_tenders_%';
