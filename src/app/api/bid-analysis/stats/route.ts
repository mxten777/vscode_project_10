/**
 * 낙찰 통계 대시보드 API
 * GET /api/bid-analysis/stats?type=agency|industry|region&value=xxx&months=6
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type") || "overall";
    const value = request.nextUrl.searchParams.get("value");
    const months = parseInt(request.nextUrl.searchParams.get("months") || "6");

    const supabase = await createClient();
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months);

    // 기본 쿼리
    let query = supabase
      .from("bid_awards")
      .select(
        `
        winner_bid_rate,
        winner_bid_amount,
        total_bidders:bid_open_results(total_bidders),
        bid_notices!inner(
          demand_organization,
          industry_code,
          industry_name,
          region_code,
          region_name,
          estimated_price,
          open_datetime
        )
      `
      )
      .eq("is_final", true)
      .gte("awarded_at", sinceDate.toISOString());

    // 타입별 필터링
    if (type === "agency" && value) {
      query = query.eq("bid_notices.demand_organization", value);
    } else if (type === "industry" && value) {
      query = query.eq("bid_notices.industry_code", value);
    } else if (type === "region" && value) {
      query = query.eq("bid_notices.region_code", value);
    }

    const { data: awards, error } = await query;

    if (error) {
      console.error("[stats] Query error:", error);
      return apiResponse.error("Failed to fetch statistics", 500);
    }

    if (!awards || awards.length === 0) {
      return apiResponse.success({
        count: 0,
        message: "No data available for the specified criteria",
      });
    }

    // 통계 계산
    const bidRates = awards.map((a) => a.winner_bid_rate).filter((r) => r !== null);
    const bidAmounts = awards.map((a) => a.winner_bid_amount).filter((a) => a !== null);

    const sortedRates = [...bidRates].sort((a, b) => a - b);
    const sortedAmounts = [...bidAmounts].sort((a, b) => a - b);

    const stats = {
      count: awards.length,
      bid_rate: {
        min: Math.min(...bidRates),
        max: Math.max(...bidRates),
        mean: bidRates.reduce((sum, r) => sum + r, 0) / bidRates.length,
        median: sortedRates[Math.floor(sortedRates.length / 2)],
        p25: sortedRates[Math.floor(sortedRates.length * 0.25)],
        p75: sortedRates[Math.floor(sortedRates.length * 0.75)],
      },
      bid_amount: {
        min: Math.min(...bidAmounts),
        max: Math.max(...bidAmounts),
        mean: bidAmounts.reduce((sum, a) => sum + a, 0) / bidAmounts.length,
        median: sortedAmounts[Math.floor(sortedAmounts.length / 2)],
        total: bidAmounts.reduce((sum, a) => sum + a, 0),
      },
    };

    // 월별 트렌드
    type MonthlyData = {
      month: string;
      count: number;
      total_amount: number;
      rates: number[];
      avg_bid_rate?: number;
    };
    const monthlyTrend = awards.reduce((acc: Record<string, MonthlyData>, award) => {
      const noticeData = Array.isArray(award.bid_notices) ? award.bid_notices[0] : award.bid_notices;
      const month = new Date(noticeData?.open_datetime || new Date()).toISOString().substring(0, 7);
      if (!acc[month]) {
        acc[month] = {
          month,
          count: 0,
          total_amount: 0,
          avg_bid_rate: 0,
          rates: [],
        };
      }
      acc[month].count++;
      acc[month].total_amount += award.winner_bid_amount || 0;
      acc[month].rates.push(award.winner_bid_rate);
      return acc;
    }, {});

    // 월별 평균 계산
    const trendData = Object.values(monthlyTrend).map((m) => ({
      month: m.month,
      count: m.count,
      total_amount: m.total_amount,
      avg_bid_rate: m.rates.reduce((sum: number, r: number) => sum + r, 0) / m.rates.length,
    }));

    // 상위 기관/업종/지역 (type이 overall일 때)
    let topCategories = {};
    if (type === "overall") {
      const byAgency = groupBy(awards, (a) => {
        const noticeData = Array.isArray(a.bid_notices) ? a.bid_notices[0] : a.bid_notices;
        return noticeData?.demand_organization || "Unknown";
      });
      const byIndustry = groupBy(awards, (a) => {
        const noticeData = Array.isArray(a.bid_notices) ? a.bid_notices[0] : a.bid_notices;
        return noticeData?.industry_name || "Unknown";
      });
      const byRegion = groupBy(awards, (a) => {
        const noticeData = Array.isArray(a.bid_notices) ? a.bid_notices[0] : a.bid_notices;
        return noticeData?.region_name || "Unknown";
      });

      topCategories = {
        top_agencies: topN(byAgency, 10),
        top_industries: topN(byIndustry, 10),
        top_regions: topN(byRegion, 10),
      };
    }

    return apiResponse.success({
      filter: { type, value, months },
      stats,
      trend: trendData.sort((a, b) => a.month.localeCompare(b.month)),
      ...topCategories,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[stats] Error:", error);
    return apiResponse.error(message);
  }
}

// Utility: Group by
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item) || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// Utility: Top N by count
function topN(grouped: Record<string, unknown[]>, n: number) {
  return Object.entries(grouped)
    .map(([name, items]) => ({
      name,
      count: items.length,
      total_amount: items.reduce(
        (sum: number, i) =>
          sum +
          ((i as { winner_bid_amount?: number }).winner_bid_amount || 0),
        0
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
