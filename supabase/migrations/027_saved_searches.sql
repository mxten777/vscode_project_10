-- ================================================================
-- Migration 027: saved_searches
-- 목적:
--   사용자가 홈 검색 조건을 조직/계정 범위로 저장하고,
--   여러 기기에서 다시 불러올 수 있도록 지원.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  query_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_org_user_created
  ON public.saved_searches (org_id, user_id, created_at DESC);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches_select_own"
  ON public.saved_searches FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "saved_searches_insert_own"
  ON public.saved_searches FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "saved_searches_delete_own"
  ON public.saved_searches FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_saved_searches_updated
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();