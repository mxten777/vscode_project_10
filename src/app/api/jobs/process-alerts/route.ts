import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";
import { getNotificationProvider } from "@/lib/notifications";
import { errorResponse, successResponse, internalErrorResponse } from "@/lib/api-response";
import type { AlertRuleJson } from "@/lib/types";

/**
 * POST /api/jobs/process-alerts
 * 활성 alert_rules를 평가하여 매칭되는 신규 공고에 대해 알림 발송
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return errorResponse("UNAUTHORIZED", "잘못된 인증 키", 401);
  }

  const supabase = createServiceClient();
  const stats = { evaluated: 0, sent: 0, failed: 0 };

  try {
    // 1) 활성 알림 규칙 전체 조회
    const { data: rules, error: rulesErr } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("is_enabled", true);

    if (rulesErr || !rules) {
      return internalErrorResponse("알림 규칙 조회 실패");
    }

    // 2) 최근 15분 이내에 수집된 신규 공고
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentTenders } = await supabase
      .from("tenders")
      .select("*")
      .gte("created_at", since);

    if (!recentTenders?.length) {
      return successResponse({ message: "신규 공고 없음", ...stats });
    }

    // 3) 각 규칙에 대해 매칭 + 발송
    for (const rule of rules) {
      stats.evaluated++;
      const ruleJson = rule.rule_json as AlertRuleJson;
      const matched = recentTenders.filter((t) => matchesRule(t, ruleJson, rule.type));

      if (!matched.length) continue;

      // 사용자 이메일 조회
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

    return successResponse({ message: "알림 처리 완료", ...stats });
  } catch (err) {
    console.error("process-alerts 오류:", err);
    return internalErrorResponse();
  }
}

// ─── 유틸 ──────────────────────────────────────────────

function matchesRule(
  tender: Record<string, unknown>,
  ruleJson: AlertRuleJson,
  type: string
): boolean {
  if (type === "KEYWORD" && ruleJson.keyword) {
    const title = (tender.title as string) || "";
    const titleLower = title.toLowerCase();
    // 공백으로 분리된 키워드를 OR 조건으로 매칭 ("AI RAG LLM" → AI 또는 RAG 또는 LLM)
    const keywords = ruleJson.keyword.split(/\s+/).filter(Boolean);
    const matched = keywords.some((kw) => titleLower.includes(kw.toLowerCase()));
    if (!matched) return false;
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
  return `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2 style="color: #1a56db;">새로운 입찰 공고 알림</h2>
      <hr />
      <p><strong>공고명:</strong> ${tender.title}</p>
      <p><strong>예산:</strong> ${tender.budget_amount ? Number(tender.budget_amount).toLocaleString() + "원" : "미정"}</p>
      <p><strong>마감일:</strong> ${tender.deadline_at || "미정"}</p>
      <p><strong>지역:</strong> ${tender.region_name || "전국"}</p>
      <br />
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/tenders/${tender.id}"
         style="background: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        상세 보기
      </a>
    </div>
  `;
}
