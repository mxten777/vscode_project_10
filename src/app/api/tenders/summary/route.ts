import { getAuthContext } from "@/lib/auth-context";
import { internalErrorResponse, successResponse } from "@/lib/api-response";

/**
 * GET /api/tenders/summary
 * DB 전체 기준 실시간 통계 (히어로 배너 + 스탯 카드용)
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { supabase } = ctx;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const [total, open, urgent, closingToday, budgetAll, budgetOpen] = await Promise.all([
      // 전체 공고 수
      supabase.from("tenders").select("*", { count: "exact", head: true }),

      // 진행중 (OPEN)
      supabase.from("tenders").select("*", { count: "exact", head: true }).eq("status", "OPEN"),

      // 마감임박: OPEN + deadline_at 3일 이내
      supabase
        .from("tenders")
        .select("*", { count: "exact", head: true })
        .eq("status", "OPEN")
        .not("deadline_at", "is", null)
        .lte("deadline_at", threeDaysLater)
        .gte("deadline_at", today.toISOString()),

      // 오늘 마감: OPEN + deadline_at = today
      supabase
        .from("tenders")
        .select("*", { count: "exact", head: true })
        .eq("status", "OPEN")
        .gte("deadline_at", `${todayStr}T00:00:00`)
        .lte("deadline_at", `${todayStr}T23:59:59`),

      // 전체 예산 합계
      supabase
        .from("tenders")
        .select("budget_amount")
        .not("budget_amount", "is", null),

      // 진행중 예산 합계
      supabase
        .from("tenders")
        .select("budget_amount")
        .eq("status", "OPEN")
        .not("budget_amount", "is", null),
    ]);

    const sumBudget = (rows: { budget_amount: number }[] | null) =>
      (rows ?? []).reduce((s, r) => s + (r.budget_amount || 0), 0);

    return successResponse({
      total: total.count ?? 0,
      open_count: open.count ?? 0,
      urgent_count: urgent.count ?? 0,
      closing_today: closingToday.count ?? 0,
      total_budget: sumBudget(budgetAll.data),
      open_budget: sumBudget(budgetOpen.data),
    });
  } catch (err) {
    console.error("GET /api/tenders/summary error:", err);
    return internalErrorResponse();
  }
}
