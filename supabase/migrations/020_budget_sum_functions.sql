-- ================================================================
-- Migration 020: 예산 합계 RPC 함수
-- 목적:
--   summary API에서 Supabase 기본 1,000행 제한으로 인해
--   total_budget이 잘렸던 버그 수정.
--   DB SUM으로 직접 집계하여 정확한 값 반환.
-- ================================================================

CREATE OR REPLACE FUNCTION public.sum_budget_all()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(budget_amount), 0)
  FROM public.tenders
  WHERE budget_amount IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.sum_budget_open()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(budget_amount), 0)
  FROM public.tenders
  WHERE budget_amount IS NOT NULL
    AND status = 'OPEN';
$$;

GRANT EXECUTE ON FUNCTION public.sum_budget_all() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sum_budget_open() TO authenticated, service_role;
