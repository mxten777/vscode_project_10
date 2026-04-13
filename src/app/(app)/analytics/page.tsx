"use client";

import { useState } from "react";
import Link from "next/link";
import { useBidAnalytics, useAIInsights } from "@/hooks/use-api";
import { formatKRW, formatBudgetCompact, getDday } from "@/lib/helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Award,
  Building,
  MapPin,
  Calendar,
  Activity,
  Zap,
  Target,
  DollarSign,
  FileText,
  Users,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
];

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "blue" | "emerald" | "amber" | "rose";
}

function KPICard({ title, value, subtitle, icon, trend, color = "blue" }: KPICardProps) {
  const colorClasses = {
    blue: {
      bg: "from-blue-500/15 to-blue-500/5",
      icon: "text-blue-600 dark:text-blue-500",
      text: "text-blue-700 dark:text-blue-400",
    },
    emerald: {
      bg: "from-emerald-500/15 to-emerald-500/5",
      icon: "text-emerald-600 dark:text-emerald-500",
      text: "text-emerald-700 dark:text-emerald-400",
    },
    amber: {
      bg: "from-amber-500/15 to-amber-500/5",
      icon: "text-amber-600 dark:text-amber-500",
      text: "text-amber-700 dark:text-amber-400",
    },
    rose: {
      bg: "from-rose-500/15 to-rose-500/5",
      icon: "text-rose-600 dark:text-rose-500",
      text: "text-rose-700 dark:text-rose-400",
    },
  };

  const classes = colorClasses[color];

  return (
    <Card className="premium-card">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">{title}</p>
            <p className="text-3xl font-extrabold tracking-tight mb-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp
                  className={`h-3.5 w-3.5 ${trend.isPositive ? "text-emerald-600" : "text-rose-600 rotate-180"}`}
                />
                <span
                  className={`text-xs font-medium ${trend.isPositive ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">전월 대비</span>
              </div>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${classes.bg}`}>
            <div className={classes.icon}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [analysisType, setAnalysisType] = useState<"overall" | "agency" | "industry" | "region">("overall");
  const [months, setMonths] = useState(6);

  const { data: analytics, isLoading } = useBidAnalytics(
    analysisType,
    analysisType === "overall" ? undefined : undefined,
    months
  );

  const { data: aiInsights, isLoading: aiLoading } = useAIInsights(10);

  // 모의 데이터 (실제로는 analytics에서 가져옴)
  const kpiData = {
    total_bids: (analytics as Record<string, unknown>)?.total_bids as number ?? 0,
    avg_bid_rate: (analytics as Record<string, unknown>)?.avg_bid_rate as number ?? 0,
    total_amount: (analytics as Record<string, unknown>)?.total_amount as number ?? 0,
    active_agencies: (analytics as Record<string, unknown>)?.active_agencies as number ?? 0,
  };

  // 월별 트렌드 데이터 변환
  const trendData = Array.isArray((analytics as Record<string, unknown>)?.trend)
    ? ((analytics as Record<string, unknown>).trend as Array<Record<string, unknown>>).map((data) => ({
        month: ((data.month as string) ?? "").replace(/^20(\d{2})-(\d{2})$/, "'$1.$2"), // "2025-03" → "'25.03"
        count: data.count as number,
        avg_rate: parseFloat(((data.avg_bid_rate as number)?.toFixed?.(2) ?? "0")),
        total_amount: ((data.total_amount as number) ?? 0) / 100000000, // 억 단위
      }))
    : [];

  // Top N 데이터 변환
  const topData =
    analysisType !== "overall" && (analytics as Record<string, unknown>)?.top_categories
      ? ((analytics as Record<string, unknown>).top_categories as Array<Record<string, unknown>>).slice(0, 10).map((item) => ({
          name: ((item.name as string)?.substring?.(0, 15) ?? "기타"),
          count: item.count as number,
          avg_rate: parseFloat(((item.avg_bid_rate as number)?.toFixed?.(2) ?? "0")),
        }))
      : [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">낙찰 분석 대시보드</h1>
          <p className="text-muted-foreground">
            과거 낙찰 데이터를 분석하여 입찰 전략을 수립하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">최근 3개월</SelectItem>
              <SelectItem value="6">최근 6개월</SelectItem>
              <SelectItem value="12">최근 12개월</SelectItem>
              <SelectItem value="24">최근 24개월</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
          <KPICard
            title="총 낙찰 건수"
            value={kpiData.total_bids.toLocaleString()}
            subtitle={`최근 ${months}개월`}
            icon={<FileText className="h-5 w-5" />}
            color="blue"
          />
          <KPICard
            title="평균 낙찰률"
            value={`${kpiData.avg_bid_rate.toFixed(2)}%`}
            subtitle="전체 평균"
            icon={<Target className="h-5 w-5" />}
            color="emerald"
          />
          <KPICard
            title="총 낙찰금액"
            value={formatKRW(kpiData.total_amount)}
            subtitle="누적 금액"
            icon={<DollarSign className="h-5 w-5" />}
            color="amber"
          />
          <KPICard
            title="참여 기관"
            value={kpiData.active_agencies.toLocaleString()}
            subtitle="활성 발주기관"
            icon={<Building className="h-5 w-5" />}
            color="rose"
          />
        </div>
      )}

      {/* Analysis Tabs */}
      <Tabs defaultValue="overall" className="space-y-4" onValueChange={(v) => setAnalysisType(v as "overall" | "agency" | "industry" | "region")}>
        <TabsList className="grid w-full grid-cols-4 gap-2 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overall" className="rounded-lg">
            <Activity className="h-4 w-4 mr-2" />
            전체 분석
          </TabsTrigger>
          <TabsTrigger value="agency" className="rounded-lg">
            <Building className="h-4 w-4 mr-2" />
            기관별
          </TabsTrigger>
          <TabsTrigger value="industry" className="rounded-lg">
            <Zap className="h-4 w-4 mr-2" />
            업종별
          </TabsTrigger>
          <TabsTrigger value="region" className="rounded-lg">
            <MapPin className="h-4 w-4 mr-2" />
            지역별
          </TabsTrigger>
        </TabsList>

        {/* Overall Analysis */}
        <TabsContent value="overall" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Monthly Trend Chart */}
            <Card className="premium-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  월별 트렌드
                </CardTitle>
                <CardDescription>낙찰 건수 및 평균 낙찰률 추이</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-80 rounded-xl" />
                ) : trendData.length > 0 ? (
                  <div className="w-full" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} tickLine={false} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981"
                        fontSize={12}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="낙찰 건수"
                        dot={{ fill: "#3b82f6", r: 4 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avg_rate"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="평균 낙찰률 (%)"
                        dot={{ fill: "#10b981", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-80 text-muted-foreground">
                    <p className="text-sm">데이터가 수집 중입니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agency/Industry/Region Analysis */}
        {["agency", "industry", "region"].map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {type === "agency" ? "기관별" : type === "industry" ? "업종별" : "지역별"} Top 10
                </CardTitle>
                <CardDescription>낙찰 건수 기준 상위 10개</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-96 rounded-xl" />
                ) : topData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="count" fill="#3b82f6" name="낙찰 건수" radius={[0, 8, 8, 0]}>
                        {topData.map((_entry, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    <p className="text-sm">데이터가 수집 중입니다</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bid Rate Distribution */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  평균 낙찰률 비교
                </CardTitle>
                <CardDescription>
                  {type === "agency" ? "기관별" : type === "industry" ? "업종별" : "지역별"} 평균 낙찰률
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-96 rounded-xl" />
                ) : topData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        domain={[85, 100]}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value) => `${value ?? 0}%`}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="avg_rate" fill="#10b981" name="평균 낙찰률 (%)" radius={[0, 8, 8, 0]}>
                        {topData.map((_entry, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    <p className="text-sm">데이터가 수집 중입니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Data Collection Notice */}
      <Card className="premium-card border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                데이터 수집 안내
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                낙찰 분석 데이터는 평일 18:10(KST)에 자동으로 수집됩니다. 충분한 데이터가 수집되면 더 정확한 분석이 제공됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── AI 인사이트 섹션 ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-lg font-bold">AI 입찰 의사결정</h2>
            <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
              Beta
            </span>
          </div>
          {aiInsights?.computed_at && (
            <p className="text-xs text-muted-foreground">
              업데이트: {new Date(aiInsights.computed_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {/* 낙찰 가능성 공식 설명 */}
        <Card className="premium-card border-violet-500/20 bg-violet-50/30 dark:bg-violet-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 shrink-0">
                <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-100 mb-1">낙찰 가능성 계산 공식</p>
                <p className="text-xs text-violet-700 dark:text-violet-300 font-mono">
                  낙찰 가능성 = <span className="font-semibold">(업종 낙찰률 × 0.4)</span> + (기관 낙찰률 × 0.3) + (지역 낙찰률 × 0.2) + (경쟁강도 × 0.1)
                </p>
                <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-1">
                  * 역사 데이터가 없는 차원은 50% 중립값 적용 | 경쟁강도 = max(0, 100 - 평균참여업체수 × 5)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <AIDetailCard
            title="AI 추천 공고"
            subtitle="종합 점수 1~10위"
            icon={<Sparkles className="h-4 w-4" />}
            colorClass="text-violet-600 dark:text-violet-400"
            bgClass="bg-violet-500/10"
            borderClass="border-violet-500/20"
            items={aiInsights?.recommended ?? []}
            isLoading={aiLoading}
          />
          <AIDetailCard
            title="낙찰 가능성 높음"
            subtitle="승률 65% 이상 공고"
            icon={<Target className="h-4 w-4" />}
            colorClass="text-emerald-600 dark:text-emerald-400"
            bgClass="bg-emerald-500/10"
            borderClass="border-emerald-500/20"
            items={aiInsights?.high_probability ?? []}
            isLoading={aiLoading}
          />
          <AIDetailCard
            title="경쟁 적은 공고"
            subtitle="평균 경쟁업체 수 최소"
            icon={<Users className="h-4 w-4" />}
            colorClass="text-blue-600 dark:text-blue-400"
            bgClass="bg-blue-500/10"
            borderClass="border-blue-500/20"
            items={aiInsights?.low_competition ?? []}
            isLoading={aiLoading}
            showBidders
          />
          <AIDetailCard
            title="수익성 높은 공고"
            subtitle="예산 × 낙찰 가능성 최대"
            icon={<Award className="h-4 w-4" />}
            colorClass="text-amber-600 dark:text-amber-400"
            bgClass="bg-amber-500/10"
            borderClass="border-amber-500/20"
            items={aiInsights?.high_profitability ?? []}
            isLoading={aiLoading}
          />
        </div>
      </div>
    </div>
  );
}

// ─── AI Detail Card ──────────────────────────────────────────────────────────

import type { AIInsightTender } from "@/lib/types";

interface AIDetailCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  items: AIInsightTender[];
  isLoading: boolean;
  showBidders?: boolean;
}

function AIDetailCard({
  title,
  subtitle,
  icon,
  colorClass,
  bgClass,
  borderClass,
  items,
  isLoading,
  showBidders = false,
}: AIDetailCardProps) {
  return (
    <Card className={`premium-card flex flex-col border ${borderClass}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${bgClass}`}>
            <span className={colorClass}>{icon}</span>
          </span>
          {title}
        </CardTitle>
        <CardDescription className="text-[11px]">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              낙찰 데이터 수집 중<br />
              <span className="text-[10px]">데이터 누적 후 표시됩니다</span>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => {
              const dday = getDday(item.deadline_at);
              return (
                <Link
                  key={item.id}
                  href={`/tenders/${item.id}`}
                  className="block rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/50 hover:border-primary/20 transition-all p-2.5 group"
                >
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 text-[10px] font-extrabold w-5 text-right tabular-nums ${colorClass}`}>
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold tabular-nums ${colorClass}`}>
                          {showBidders
                            ? `경쟁 ${item.avg_bidders}개사`
                            : `승률 ${item.win_probability}%`}
                        </span>
                        {item.budget_amount && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatBudgetCompact(item.budget_amount)}
                          </span>
                        )}
                        {dday && (
                          <span className={`text-[10px] font-semibold ${dday.urgent ? "text-rose-500" : "text-muted-foreground"}`}>
                            {dday.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
