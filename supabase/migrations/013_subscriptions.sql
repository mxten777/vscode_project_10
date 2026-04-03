-- ================================================================
-- Migration 013: Stripe 구독 테이블 + 팀 초대 테이블
-- 목적:
--   Stripe Webhook 이벤트로 구독 상태를 관리하고
--   orgs.plan 을 단일 진실 출처(subscriptions)와 동기화
-- ================================================================

-- 1. subscriptions 테이블 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_sub_id        text        UNIQUE,                 -- Stripe Subscription ID (sub_xxx)
  stripe_cust_id       text        UNIQUE,                 -- Stripe Customer ID (cus_xxx)
  plan                 text        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status               text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  current_period_end   timestamptz,                        -- 현재 구독 기간 종료일
  cancel_at_period_end boolean     NOT NULL DEFAULT false, -- 기간 종료 시 자동 해지 여부
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id    ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON subscriptions(stripe_cust_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 서비스 롤(Webhook 처리): 전체 권한
CREATE POLICY "service_role_full_access_subscriptions"
  ON subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 조직 admin: 자신의 구독 조회
CREATE POLICY "org_admin_read_own_subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. 신규 회원가입 시 free 구독 자동 생성 트리거
--    (migration 002의 handle_new_user 기반 org 생성 직후 실행)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_org_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (org_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_created_subscription ON public.orgs;

CREATE TRIGGER on_org_created_subscription
  AFTER INSERT ON public.orgs
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_org_subscription();

-- ─────────────────────────────────────────────────────────────
-- 3. subscriptions.plan 변경 시 orgs.plan 동기화 트리거
--    (단일 진실 출처: subscriptions → orgs)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_org_plan_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 구독이 취소/만료되면 free로 강등, 그 외에는 plan 동기화
  IF NEW.status IN ('canceled') OR
     (NEW.current_period_end IS NOT NULL AND NEW.current_period_end < now()) THEN
    UPDATE public.orgs SET plan = 'free' WHERE id = NEW.org_id;
  ELSE
    UPDATE public.orgs SET plan = NEW.plan WHERE id = NEW.org_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_plan_changed ON public.subscriptions;

CREATE TRIGGER on_subscription_plan_changed
  AFTER INSERT OR UPDATE OF plan, status, current_period_end ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_org_plan_from_subscription();

-- ─────────────────────────────────────────────────────────────
-- 4. org_invitations 테이블 (팀 초대 — Phase 5 준비)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_invitations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  role       text        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token      text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON org_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token  ON org_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email  ON org_invitations(email);

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- admin: 자신의 조직 초대 관리
CREATE POLICY "org_admin_manage_invitations"
  ON org_invitations FOR ALL TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 서비스 롤: 전체 권한 (수락 처리)
CREATE POLICY "service_role_full_access_invitations"
  ON org_invitations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 5. 기존 orgs에 대해 free subscriptions 백필
-- ─────────────────────────────────────────────────────────────
INSERT INTO subscriptions (org_id, plan, status)
SELECT id, plan, 'active'
FROM orgs
WHERE id NOT IN (SELECT org_id FROM subscriptions)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE subscriptions IS 'Stripe 구독 정보. orgs.plan 의 단일 진실 출처.';
COMMENT ON COLUMN subscriptions.stripe_sub_id IS 'Stripe Subscription ID (sub_xxx). free 플랜은 NULL.';
COMMENT ON COLUMN subscriptions.stripe_cust_id IS 'Stripe Customer ID (cus_xxx). 결제 등록 시 생성.';
COMMENT ON TABLE org_invitations IS '조직 멤버 초대 토큰 (7일 유효).';
