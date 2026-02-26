import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, internalErrorResponse } from "@/lib/api-response";

/**
 * GET /api/reports/summary?from=&to=
 * 공고 수, 기관 TOP, 업종 TOP, 예산 합
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyDateFilter = <T extends { gte: (...a: any[]) => any; lte: (...a: any[]) => any }>(q: T): T => {
      let filtered = q;
      if (from) filtered = filtered.gte("published_at", from);
      if (to) filtered = filtered.lte("published_at", to);
      return filtered;
    };

    // 1) 총 공고 수
    const { count: totalTenders } = await applyDateFilter(
      supabase.from("tenders").select("*", { count: "exact", head: true })
    );

    // 예산 합 — RPC가 없으므로 데이터 끌어와서 합산 (MVP)
    const { data: budgetRows } = await applyDateFilter(
      supabase.from("tenders").select("budget_amount")
    );
    const totalBudget = (budgetRows ?? []).reduce(
      (sum: number, r: { budget_amount: number | null }) => sum + (Number(r.budget_amount) || 0),
      0
    );

    // 2) 상태 분포
    const { data: allTenders } = await applyDateFilter(
      supabase.from("tenders").select("status")
    );
    const statusMap: Record<string, number> = {};
    (allTenders ?? []).forEach((t: { status: string }) => {
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    // 3) 기관 TOP 10
    const { data: agencyRows } = await applyDateFilter(
      supabase.from("tenders").select("agency:agencies(name)")
    );
    const agencyMap: Record<string, number> = {};
    (agencyRows ?? []).forEach((r: Record<string, unknown>) => {
      const agency = r.agency as { name: string } | null;
      const name = agency?.name ?? "N/A";
      agencyMap[name] = (agencyMap[name] || 0) + 1;
    });
    const topAgencies = Object.entries(agencyMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4) 업종 TOP 10
    const { data: industryRows } = await applyDateFilter(
      supabase.from("tenders").select("industry_name")
    );
    const industryMap: Record<string, number> = {};
    (industryRows ?? []).forEach((r: { industry_name: string | null }) => {
      const name = r.industry_name ?? "N/A";
      industryMap[name] = (industryMap[name] || 0) + 1;
    });
    const topIndustries = Object.entries(industryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return successResponse({
      totalTenders: totalTenders ?? 0,
      totalBudget,
      topAgencies,
      topIndustries,
      statusDistribution,
    });
  } catch (err) {
    console.error("GET /api/reports/summary error:", err);
    return internalErrorResponse();
  }
}
