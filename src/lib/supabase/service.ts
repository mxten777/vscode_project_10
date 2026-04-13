import { createClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 클라이언트 — RLS 바이패스
 * 서버 사이드 job(수집/알림)에서만 사용한다.
 */
export function createServiceClient() {
  // SUPABASE_URL (server-only, runtime) takes priority over NEXT_PUBLIC_ (baked at build time)
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  return createClient(
    url,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
    { auth: { persistSession: false } }
  );
}
