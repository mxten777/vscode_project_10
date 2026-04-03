-- ================================================================
-- Migration 017: 보고서 저장 테이블 (reports)
-- 목적:
--   사용자가 조회한 보고서 스냅샷을 저장하고, 향후 Supabase Storage
--   PDF 업로드 경로를 연결할 수 있는 구조 제공.
--   조직(org) 범위의 보고서 히스토리 관리 지원.
-- ================================================================

-- 1. reports 테이블
CREATE TABLE IF NOT EXISTS public.reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title         text        NOT NULL,
  from_date     timestamptz,
  to_date       timestamptz,
  -- Supabase Storage 경로 (예: reports-pdf/{org_id}/{report_id}.pdf)
  storage_path  text,
  -- 보고서 생성 시점의 데이터 스냅샷 (JSONB)
  summary_data  jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_org_created
  ON public.reports (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_user
  ON public.reports (user_id);

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 조직 멤버: 같은 org의 보고서 조회
CREATE POLICY "org_members_read_reports"
  ON public.reports FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- 인증된 사용자: 자신의 org 보고서 생성
CREATE POLICY "org_members_insert_reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- 작성자 본인: 삭제 가능
CREATE POLICY "report_owner_delete"
  ON public.reports FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 서비스 롤: 전체 권한 (PDF 업로드 경로 갱신 등)
CREATE POLICY "service_role_full_access_reports"
  ON public.reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ================================================================
-- 2. Supabase Storage 버킷 설정 안내 (SQL로 직접 생성 불가 — 대시보드 사용)
-- ================================================================
-- Supabase 대시보드 → Storage → New bucket
--   이름: reports-pdf
--   Public: false (서명된 URL로만 접근)
--
-- RLS Policy (Storage):
--   SELECT: auth.uid() IN (
--     SELECT user_id FROM org_members WHERE org_id = (storage.foldername(name))[1]::uuid
--   )
--   INSERT: 서비스 롤 전용 (API Route Handler에서 service_role_key 사용)
-- ================================================================

COMMENT ON TABLE public.reports IS '보고서 저장 히스토리. summary_data에 생성 시점 스냅샷 포함.';
COMMENT ON COLUMN public.reports.storage_path IS 'Supabase Storage의 reports-pdf 버킷 내 경로. PDF 생성 전은 NULL.';
COMMENT ON COLUMN public.reports.summary_data IS 'report_summary() RPC 반환값 스냅샷 (JSONB). 재조회 없이 히스토리 재현 가능.';
