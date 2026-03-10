"use client";

import { useState } from "react";
import { useReportSummary } from "@/hooks/use-api";
import { formatKRW } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  FileText,
  Building,
  Briefcase,
  Banknote,
  CalendarDays,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STATUS_COLORS: Record<string, { fill: string; label: string }> = {
  OPEN: { fill: "#4f46e5", label: "진행중" },
  CLOSED: { fill: "#9ca3af", label: "마감" },
  RESULT: { fill: "#f59e0b", label: "결과발표" },
};

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fromISO = from ? new Date(from).toISOString() : undefined;
  const toISO = to ? new Date(to + "T23:59:59").toISOString() : undefined;

  const { data, isLoading } = useReportSummary(fromISO, toISO);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 via-indigo-900 to-indigo-950 px-8 py-8 sm:px-10">
        <div className="noise-overlay" />
        <div className="absolute top-[-20%] right-[-5%] h-[240px] w-[240px] rounded-full bg-violet-500/25 blur-[90px] animate-mesh pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 mb-3">
              <BarChart3 className="h-3 w-3 text-violet-300" />
              통계 분석 리포트
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">리포트</h1>
            <p className="text-white/50 mt-1">기간별 입찰 공고 통계를 확인하세요</p>
          </div>
          {data && (
            <div className="flex gap-3 flex-wrap">
              {[{label: "총 공고", val: data.totalTenders.toLocaleString() + "건"}, {label: "기관 수", val: data.topAgencies.length + "개"}, {label: "업종 수", val: data.topIndustries.length + "개"}].map(({label, val}) => (
                <div key={label} className="text-center">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest">{label}</p>
                  <p className="text-white font-bold text-sm">{val}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Picker */}
      <Card className="premium-card overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <CalendarDays className="h-3.5 w-3.5" />
                시작일
              </Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <CalendarDays className="h-3.5 w-3.5" />
                종료일
              </Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              variant="outline"
              className="gap-1.5 h-11 rounded-lg"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
            <SummaryCard
              icon={<FileText className="h-5 w-5 text-primary" />}
              iconBg="bg-primary/10"
              title="총 공고 수"
              value={data.totalTenders.toLocaleString()}
              suffix="건"
            />
            <SummaryCard
              icon={<Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              iconBg="bg-emerald-500/10"
              title="총 예산"
              value={formatKRW(data.totalBudget)}
            />
            <SummaryCard
              icon={<Building className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
              iconBg="bg-violet-500/10"
              title="발주 기관"
              value={String(data.topAgencies.length)}
              suffix="개 (TOP)"
            />
            <SummaryCard
              icon={<Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
              iconBg="bg-amber-500/10"
              title="업종"
              value={String(data.topIndustries.length)}
              suffix="개 (TOP)"
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Pie Chart - Status Distribution */}
            <Card className="lg:col-span-2 premium-card card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">상태 분포</CardTitle>
                <CardDescription>공고 상태별 비율</CardDescription>
              </CardHeader>
              <CardContent>
                {data.statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={data.statusDistribution.map((s) => ({
                            name: STATUS_COLORS[s.status]?.label ?? s.status,
                            value: s.count,
                            fill: STATUS_COLORS[s.status]?.fill ?? "#6b7280",
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {data.statusDistribution.map((s, idx) => (
                            <Cell
                              key={idx}
                              fill={STATUS_COLORS[s.status]?.fill ?? "#6b7280"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                          formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()}건`, ""]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          iconSize={8}
                          formatter={(value: string) => (
                            <span className="text-xs text-muted-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    데이터 없음
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Top Agencies */}
            <Card className="lg:col-span-3 premium-card card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  TOP 발주기관
                </CardTitle>
                <CardDescription>공고 건수 기준 상위 기관</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topAgencies.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={data.topAgencies.slice(0, 8).map((a) => ({
                          name: a.name.length > 10 ? a.name.slice(0, 10) + "…" : a.name,
                          count: a.count,
                        }))}
                        margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                        barSize={28}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                          formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()}건`, "공고 수"]}
                        />
                        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    데이터 없음
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Industry Rank Card */}
          <Card className="premium-card card-hover">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                TOP 업종
              </CardTitle>
              <CardDescription>공고 건수 기준 상위 업종</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topIndustries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">데이터 없음</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.topIndustries.map((item, i) => {
                    const max = data.topIndustries[0].count || 1;
                    const pct = (item.count / max) * 100;
                    return (
                      <div key={item.name} className="flex items-center gap-3 group">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{item.name}</span>
                            <span className="text-sm font-semibold shrink-0 ml-2">
                              {item.count.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-0.5">건</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-primary/60"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  iconBg,
  title,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string;
  suffix?: string;
}) {
  return (
    <Card className="stat-card premium-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-extrabold mt-1.5 tracking-tight">
              {value}
              {suffix && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {suffix}
                </span>
              )}
            </p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
            {icon}
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3 mr-1" />
          선택 기간 기준
        </div>
      </CardContent>
    </Card>
  );
}
