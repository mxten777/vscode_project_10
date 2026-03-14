-- ============================================================
-- Migration 003: alert_rules DELETE 정책 추가
-- ============================================================

-- alert_rules: 본인이 생성한 규칙만 삭제 가능
CREATE POLICY "alert_rules_delete_own" ON public.alert_rules
  FOR DELETE USING (user_id = auth.uid());
