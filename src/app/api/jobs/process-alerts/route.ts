import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";
import { getNotificationProvider } from "@/lib/notifications";
import { errorResponse, successResponse, internalErrorResponse } from "@/lib/api-response";
import { failCollectionJob, finishCollectionJob, startCollectionJob } from "@/lib/collection-logs";
import type { AlertRuleJson } from "@/lib/types";

/**
 * POST /api/jobs/process-alerts
 * 활성 alert_rules를 평가하여 매칭되는 신규 공고에 대해 알림 발송
 */

// Vercel Cron은 GET으로 호출 → POST 핸들러로 위임
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return errorResponse("UNAUTHORIZED", "잘못된 인증 키", 401);
  }

  const supabase = createServiceClient();
  const stats = { evaluated: 0, sent: 0, failed: 0 };
  const logId = await startCollectionJob(supabase, "alerts");

  try {
    // 1) 활성 알림 규칙 전체 조회
    const { data: rules, error: rulesErr } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("is_enabled", true);

    if (rulesErr || !rules) {
      throw new Error("알림 규칙 조회 실패");
    }

    // 2) 최근 2시간 이내에 수집된 신규 공고 (Vercel Hobby 플랜 flexible window 대응)
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentTenders } = await supabase
      .from("tenders")
      .select("*")
      .gte("created_at", since);

    // 신규 공고가 없으면 규칙 평가 자체를 건너뜀 (불필요한 "없음" 이메일 방지)
    if (!recentTenders?.length) {
      await finishCollectionJob(supabase, logId, 0);
      return successResponse({ message: "신규 공고 없음 — 알림 발송 생략", ...stats });
    }

    // 3) 각 규칙에 대해 매칭 + 발송
    for (const rule of rules) {
      stats.evaluated++;
      const ruleJson = rule.rule_json as AlertRuleJson;

      const matched = recentTenders.filter((t) => matchesRule(t, ruleJson));

      // 매칭 공고 없으면 해당 규칙은 skip (이메일 미발송)
      if (!matched.length) continue;

      // 사용자 이메일 조회 (매칭된 공고가 있는 경우에만)
      const { data: userData } = await supabase.auth.admin.getUserById(rule.user_id);
      const userEmail = userData?.user?.email;
      if (!userEmail) continue;

      const provider = getNotificationProvider(rule.channel);

      for (const tender of matched) {
        // 중복 발송 방지: INSERT ON CONFLICT DO NOTHING (UNIQUE 제약 활용, TOCTOU 제거)
        const { error: logInsertErr } = await supabase
          .from("alert_logs")
          .insert({
            alert_rule_id: rule.id,
            tender_id: tender.id,
            status: "SENT",
            error_message: null,
          })
          .select()
          .single();

        // 이미 처리된 (rule, tender) 쌍이면 DB가 UNIQUE 위반으로 skip
        if (logInsertErr?.code === "23505") continue;

        // Resend 무료 플랜: 초당 2건 제한 → 600ms 간격으로 발송
        await new Promise((r) => setTimeout(r, 600));

        const result = await provider.send({
          to: userEmail,
          subject: `[입찰알림] ${tender.title}`,
          body: buildAlertBody(tender),
        });

        // 발송 실패 시 로그 상태 업데이트
        if (!result.success) {
          await supabase
            .from("alert_logs")
            .update({ status: "FAIL", error_message: result.error || null })
            .eq("alert_rule_id", rule.id)
            .eq("tender_id", tender.id);
          stats.failed++;
        } else {
          stats.sent++;
        }
      }
    }

    await finishCollectionJob(supabase, logId, stats.sent);
    return successResponse({ message: "알림 처리 완료", ...stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await failCollectionJob(supabase, logId, message);
    console.error("process-alerts 오류:", err);
    return internalErrorResponse(message === "알림 규칙 조회 실패" ? message : undefined);
  }
}

// ─── 유틸 ──────────────────────────────────────────────

function matchesRule(
  tender: Record<string, unknown>,
  ruleJson: AlertRuleJson
): boolean {
  if (ruleJson.keyword) {
    const title = (tender.title as string) || "";
    const titleLower = title.toLowerCase();
    // 공백으로 분리된 키워드를 OR 조건으로 매칭 ("AI RAG LLM" → AI 또는 RAG 또는 LLM)
    const keywords = ruleJson.keyword.split(/\s+/).filter(Boolean);
    const matched = keywords.some((kw) => titleLower.includes(kw.toLowerCase()));
    if (!matched) return false;
  }

  if (ruleJson.statuses?.length) {
    if (!ruleJson.statuses.includes(tender.status as "OPEN" | "CLOSED" | "RESULT")) return false;
  }

  if (ruleJson.regionCodes?.length) {
    if (!ruleJson.regionCodes.includes(tender.region_code as string)) return false;
  }

  if (ruleJson.industryCodes?.length) {
    if (!ruleJson.industryCodes.includes(tender.industry_code as string)) return false;
  }

  const budget = Number(tender.budget_amount) || 0;
  if (ruleJson.budgetMin != null && budget < ruleJson.budgetMin) return false;
  if (ruleJson.budgetMax != null && budget > ruleJson.budgetMax) return false;

  return true;
}

function buildAlertBody(tender: Record<string, unknown>): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bid-platform.vercel.app";
  const budget = tender.budget_amount
    ? Number(tender.budget_amount).toLocaleString("ko-KR") + "원"
    : "미정";
  const deadline = tender.deadline_at
    ? new Date(tender.deadline_at as string).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "미정";

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:28px 32px;">
            <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">BidSight</div>
            <div style="color:#c7d2fe;font-size:13px;margin-top:4px;">AI 입찰 정보 플랫폼</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#6366f1;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">새 입찰 공고 알림</p>
            <h1 style="margin:0 0 24px;color:#111827;font-size:18px;font-weight:700;line-height:1.4;">${tender.title}</h1>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#6b7280;font-size:12px;">발주기관</span>
                  <div style="color:#111827;font-size:14px;font-weight:600;margin-top:2px;">${tender.demand_agency_name || "-"}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#6b7280;font-size:12px;">예산 금액</span>
                  <div style="color:#111827;font-size:14px;font-weight:600;margin-top:2px;">${budget}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#6b7280;font-size:12px;">마감일</span>
                  <div style="color:#111827;font-size:14px;font-weight:600;margin-top:2px;">${deadline}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;">
                  <span style="color:#6b7280;font-size:12px;">지역</span>
                  <div style="color:#111827;font-size:14px;font-weight:600;margin-top:2px;">${tender.region_name || "전국"}</div>
                </td>
              </tr>
            </table>
            <a href="${appUrl}/tenders/${tender.id}"
               style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
              공고 상세 보기 →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
              이 이메일은 BidSight 알림 규칙에 의해 자동 발송되었습니다.<br />
              알림을 더 이상 받지 않으려면 <a href="${appUrl}/alerts" style="color:#6366f1;">알림 설정</a>에서 규칙을 비활성화하세요.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
