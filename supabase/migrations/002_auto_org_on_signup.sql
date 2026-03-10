-- ============================================================
-- Migration 002: 신규 회원가입 시 org 자동 생성 + org_members 등록
-- 작성일: 2026-03-10
-- 설명: auth.users INSERT 트리거 → orgs + org_members 자동 INSERT
--       신규 가입자가 수동 SQL 없이 바로 알림 규칙 생성 가능하도록 처리
-- 실행: Supabase Dashboard > SQL Editor 에서 붙여넣기 후 실행
-- ============================================================

-- 1. 트리거 함수 생성 ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- 1-1) 개인 org 생성 (이메일 기반 이름)
  INSERT INTO public.orgs (name, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'free'
  )
  RETURNING id INTO new_org_id;

  -- 1-2) org_members에 admin으로 등록
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

-- 2. auth.users INSERT 트리거 등록 ────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 검증 쿼리 (실행 후 확인)
-- ============================================================
-- SELECT routine_name FROM information_schema.routines
--   WHERE routine_name = 'handle_new_user';
--
-- SELECT trigger_name FROM information_schema.triggers
--   WHERE trigger_name = 'on_auth_user_created';
