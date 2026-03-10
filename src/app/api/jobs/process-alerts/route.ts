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

    // 2) 최근 90분 이내에 수집된 신규 공고 (poll-tenders와 1시간 간격 + 여유)
    const since = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    const { data: recentTenders } = await supabase
      .from("tenders")
      .select("*")
      .gte("created_at", since);

    // 3) 각 규칙에 대해 매칭 + 발송
    for (const rule of rules) {
      stats.evaluated++;
      const ruleJson = rule.rule_json as AlertRuleJson;

      // 사용자 이메일 조회 (결과 없음 안내에도 필요)
      const { data: userData } = await supabase.auth.admin.getUserById(rule.user_id);
      const userEmail = userData?.user?.email;
      if (!userEmail) continue;

      const provider = getNotificationProvider(rule.channel);

      // 신규 공고 자체가 없는 경우
      if (!recentTenders?.length) {
        await new Promise((r) => setTimeout(r, 600));
        await provider.send({
          to: userEmail,
          subject: `[입찰알림] 오늘 신규 공고 없음`,
          body: buildNoTendersBody(ruleJson),
        });
        stats.sent++;
        continue;
      }

      const matched = recentTenders.filter((t) => matchesRule(t, ruleJson, rule.type));

      // 매칭 공고 없는 경우 → 결과 없음 안내 이메일
      if (!matched.length) {
        await new Promise((r) => setTimeout(r, 600));
        await provider.send({
          to: userEmail,
          subject: `[입찰알림] 오늘 조건에 맞는 공고 없음`,
          body: buildNoMatchBody(ruleJson),
        });
        stats.sent++;
        continue;
      }

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

function buildNoTendersBody(ruleJson: AlertRuleJson): string {
  return `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2 style="color: #6b7280;">오늘 신규 입찰 공고 없음</h2>
      <hr />
      <p>오늘은 나라장터에서 수집된 신규 공고가 없습니다.</p>
      <p><strong>알림 키워드:</strong> ${ruleJson.keyword || "(없음)"}</p>
      <p style="color: #9ca3af; font-size: 12px;">다음 평일 오전 9시 30분에 다시 확인합니다.</p>
    </div>
  `;
}

function buildNoMatchBody(ruleJson: AlertRuleJson): string {
  return `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2 style="color: #6b7280;">오늘 조건에 맞는 공고 없음</h2>
      <hr />
      <p>오늘 수집된 공고 중 설정하신 조건에 맞는 공고가 없습니다.</p>
      <p><strong>알림 키워드:</strong> ${ruleJson.keyword || "(없음)"}</p>
      <p style="color: #9ca3af; font-size: 12px;">다음 평일 오전 9시 30분에 다시 확인합니다.</p>
    </div>
  `;
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
