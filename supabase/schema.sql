-- ============================================================
-- AI 입찰·조달 분석 플랫폼 — Supabase SQL Schema (MVP)
-- ============================================================
-- 가정 사항:
-- 1. Supabase Auth(auth.users)가 활성화되어 있다.
-- 2. pg_trgm 확장은 Supabase 프로젝트에서 활성화 가능하다.
-- 3. MVP에서 awards ↔ tenders 는 1:1 관계로 시작한다.
-- 4. org_members 기반 RLS 로 멀티테넌시를 대비한다.
-- ============================================================

-- 0. 확장 ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- A) 멀티테넌시 기본 테이블
-- ============================================================

-- orgs (조직)
CREATE TABLE IF NOT EXISTS public.orgs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  plan       text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- org_members (조직 멤버)
CREATE TABLE IF NOT EXISTS public.org_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- ============================================================
-- B) 도메인 테이블
-- ============================================================

-- agencies (발주 기관)
CREATE TABLE IF NOT EXISTS public.agencies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text UNIQUE NOT NULL,
  name       text NOT NULL,
  raw_json   jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- tenders (입찰 공고)
CREATE TABLE IF NOT EXISTS public.tenders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tender_id    text UNIQUE NOT NULL,
  title               text NOT NULL,
  agency_id           uuid REFERENCES public.agencies(id),
  demand_agency_name  text,
  budget_amount       numeric,
  region_code         text,
  region_name         text,
  industry_code       text,
  industry_name       text,
  method_type         text,
  published_at        timestamptz,
  deadline_at         timestamptz,
  status              text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','RESULT')),
  raw_json            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- awards (개찰/낙찰 결과)
CREATE TABLE IF NOT EXISTS public.awards (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id            uuid NOT NULL UNIQUE REFERENCES public.tenders(id) ON DELETE CASCADE,
  winner_company_name  text,
  awarded_amount       numeric,
  awarded_rate         numeric,
  opened_at            timestamptz,
  raw_json             jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- C) 사용자 기능 테이블
-- ============================================================

-- favorites (즐겨찾기)
CREATE TABLE IF NOT EXISTS public.favorites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tender_id  uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tender_id)
);

-- alert_rules (알림 규칙)
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('KEYWORD','FILTER')),
  rule_json  jsonb NOT NULL DEFAULT '{}',
  channel    text NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL','KAKAO')),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- alert_logs (알림 발송 로그)
CREATE TABLE IF NOT EXISTS public.alert_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id  uuid NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  tender_id      uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL CHECK (status IN ('SENT','FAIL')),
  error_message  text
);

-- ============================================================
-- 인덱스
-- ============================================================

-- tenders 기본 조회
CREATE INDEX IF NOT EXISTS idx_tenders_deadline   ON public.tenders (deadline_at);
CREATE INDEX IF NOT EXISTS idx_tenders_published  ON public.tenders (published_at);
CREATE INDEX IF NOT EXISTS idx_tenders_status     ON public.tenders (status);
CREATE INDEX IF NOT EXISTS idx_tenders_agency     ON public.tenders (agency_id);
CREATE INDEX IF NOT EXISTS idx_tenders_region     ON public.tenders (region_code);
CREATE INDEX IF NOT EXISTS idx_tenders_industry   ON public.tenders (industry_code);
CREATE INDEX IF NOT EXISTS idx_tenders_budget     ON public.tenders (budget_amount);

-- 제목 트리그램 검색
CREATE INDEX IF NOT EXISTS idx_tenders_title_trgm ON public.tenders USING gin (title gin_trgm_ops);

-- favorites 조회
CREATE INDEX IF NOT EXISTS idx_favorites_user     ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_org      ON public.favorites (org_id);

-- alert
CREATE INDEX IF NOT EXISTS idx_alert_rules_user   ON public.alert_rules (user_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_rule    ON public.alert_logs (alert_rule_id);

-- ============================================================
-- RLS 정책
-- ============================================================

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- Helper: 현재 사용자의 org_id 목록
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
$$;

-- orgs: 소속 org만 조회
CREATE POLICY "orgs_select_own" ON public.orgs
  FOR SELECT USING (id IN (SELECT public.user_org_ids()));

-- org_members: 소속 org 멤버만
CREATE POLICY "org_members_select_own" ON public.org_members
  FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));

-- agencies: 전체 공개(읽기)
CREATE POLICY "agencies_select_all" ON public.agencies
  FOR SELECT USING (true);

-- tenders: 전체 공개(읽기)
CREATE POLICY "tenders_select_all" ON public.tenders
  FOR SELECT USING (true);

-- awards: 전체 공개(읽기)
CREATE POLICY "awards_select_all" ON public.awards
  FOR SELECT USING (true);

-- favorites: 본인 org만
CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT WITH CHECK (org_id IN (SELECT public.user_org_ids()) AND user_id = auth.uid());
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE USING (user_id = auth.uid());

-- alert_rules: 본인 org만
CREATE POLICY "alert_rules_select_own" ON public.alert_rules
  FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "alert_rules_insert_own" ON public.alert_rules
  FOR INSERT WITH CHECK (org_id IN (SELECT public.user_org_ids()) AND user_id = auth.uid());
CREATE POLICY "alert_rules_update_own" ON public.alert_rules
  FOR UPDATE USING (user_id = auth.uid());

-- alert_logs: 본인 org의 rule에 대한 로그만
CREATE POLICY "alert_logs_select_own" ON public.alert_logs
  FOR SELECT USING (
    alert_rule_id IN (
      SELECT id FROM public.alert_rules WHERE org_id IN (SELECT public.user_org_ids())
    )
  );

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agencies_updated   BEFORE UPDATE ON public.agencies   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenders_updated    BEFORE UPDATE ON public.tenders    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_awards_updated     BEFORE UPDATE ON public.awards     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_alert_rules_updated BEFORE UPDATE ON public.alert_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
