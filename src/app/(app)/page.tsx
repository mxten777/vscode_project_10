"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTenders, useTenderSummary, useAIInsights } from "@/hooks/use-api";
import { formatKRW, tenderStatusLabel, formatRawDate, getDday, isNew, formatBudgetCompact } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Building,
  MapPin,
  TrendingUp,
  Clock,
  FileText,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
  Zap,
  BarChart3,
  Layers,
  Star,
  Bell,
  X,
  LayoutList,
  Table2,
  Banknote,
  Activity,
  Target,
  Users,
  Award,
} from "lucide-react";

const PAGE_SIZE_CARD = 20;
const PAGE_SIZE_TABLE = 50;

// Category chips mapping keyword → display
const CATEGORY_CHIPS = [
  { label: "전체", value: "", icon: Layers },
  { label: "소프트웨어", value: "소프트웨어", icon: Zap },
  { label: "건설·공사", value: "건설", icon: Building },
  { label: "용역·서비스", value: "용역", icon: Star },
  { label: "물품·장비", value: "물품", icon: BarChart3 },
  { label: "시설관리", value: "시설", icon: Bell },
];

// Trending keywords (swap with real analytics later)
const TRENDING = ["AI 플랫폼", "정보화시스템", "시설유지보수", "SW개발", "디지털전환", "클라우드"];

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-55 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-27 rounded-xl" />
      ))}
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") || "published_at"
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [activeCategory, setActiveCategory] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches ? "card" : "table"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // 모바일(< 640px)에서 카드 뷰 자동 선택 + 리사이즈 반응
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setViewMode(e.matches ? "card" : "table");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const handleTableSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const syncUrl = useCallback(
    (params: Record<string, string | number>) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== "" && v !== "1") sp.set(k, String(v));
      });
      router.replace(`/?${sp.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    syncUrl({ q: debouncedQ, status, sortBy, page });
  }, [debouncedQ, status, sortBy, page, syncUrl]);

  const handleCategoryChip = (val: string) => {
    setActiveCategory(val);
    setQ(val);
    setPage(1);
  };

  const { data, isLoading, error } = useTenders({
    q: debouncedQ || undefined,
    status: (status as "OPEN" | "CLOSED" | "RESULT") || undefined,
    sortBy: sortBy as "published_at" | "deadline_at" | "budget_amount" | "created_at",
    sortOrder,
    page,
    pageSize: viewMode === "table" ? PAGE_SIZE_TABLE : PAGE_SIZE_CARD,
  });

  const { data: summary } = useTenderSummary();
  const { data: aiInsights, isLoading: aiLoading } = useAIInsights(6);

  const totalPages = data ? Math.ceil(data.total / (viewMode === "table" ? PAGE_SIZE_TABLE : PAGE_SIZE_CARD)) : 0;

  const statusColor = (s: string): "default" | "secondary" | "outline" => {
    switch (s) {
      case "OPEN": return "default";
      case "CLOSED": return "secondary";
      case "RESULT": return "outline";
      default: return "secondary";
    }
  };

  const maxBudgetInPage = Math.max(1, ...(data?.data.map((t) => t.budget_amount || 0) ?? [1]));


  const hasFilters = debouncedQ || status;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ─── Hero Banner — Premium 2-column ─── */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background — deep navy-blue gradient (inline style to guarantee render across Tailwind versions) */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e2d6b 55%, #1a1060 100%)" }} />
        {/* Layered radial colour pops */}
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/25 blur-[120px]" />
          <div className="absolute -bottom-20 right-[10%] h-80 w-80 rounded-full bg-violet-500/30 blur-[100px]" />
          <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-cyan-400/15 blur-[80px]" />
        </div>
        {/* Fine grid overlay */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(103,232,249,0.7) 50%, transparent)" }} />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 px-8 py-10 sm:px-12 sm:py-12">

          {/* ── Left: text + badges ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {/* Live badge */}
            <div className="flex items-center gap-2.5">
              <span className="live-dot" />
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-1 text-xs font-semibold text-white/85">
                <Sparkles className="h-3 w-3 text-amber-300" />
                BAIKAL AI · 입찰 분석 플랫폼
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-3xl sm:text-[2.55rem] font-extrabold text-white tracking-tight leading-[1.18]">
                공공 입찰,<br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg,#38bdf8,#c084fc,#fb7185)" }}
                >
                  데이터로 앞서가세요
                </span>
              </h1>
              <p className="mt-3 text-white/70 text-[15px] leading-relaxed max-w-md">
                나라장터 전체 공고 자동 수집 · AI 낙찰 예측 · 키워드 알림까지<br className="hidden sm:block" />
                하나의 플랫폼에서 완성합니다
              </p>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: FileText, label: `공고 ${summary ? summary.total.toLocaleString() : "—"}건`, cls: "text-cyan-100 border-cyan-300/40 bg-cyan-400/20" },
                { icon: TrendingUp, label: `진행중 ${summary ? summary.open_count.toLocaleString() : "—"}건`, cls: "text-emerald-100 border-emerald-300/40 bg-emerald-400/20" },
                { icon: Clock, label: `마감임박 ${summary ? summary.urgent_count.toLocaleString() : "—"}건`, cls: "text-amber-100 border-amber-300/40 bg-amber-400/20" },
              ].map(({ icon: Icon, label, cls }) => (
                <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${cls}`}>
                  <Icon className="h-3 w-3 shrink-0" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: KPI glass card grid ── */}
          {summary && (
            <div className="shrink-0 w-full lg:w-90 grid grid-cols-2 gap-2.5">
              {[
                { label: "총 예산", value: formatBudgetCompact(summary.total_budget), sub: "전체 공고 기준", accent: "#67e8f9" },
                { label: "진행중 예산", value: formatBudgetCompact(summary.open_budget), sub: "응찰 가능 기준", accent: "#a78bfa" },
                { label: "오늘 마감", value: `${summary.closing_today}건`, sub: "D-DAY 공고", accent: "#fca5a5" },
                { label: "마감 D-3", value: `${summary.urgent_count}건`, sub: "긴급 공고", accent: "#fcd34d" },
              ].map(({ label, value, sub, accent }) => (
                <div
                  key={label}
                  className="relative rounded-2xl p-4 overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.11)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {/* Colour accent dot top-right */}
                  <div className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.60)" }}>{label}</p>
                  <p className="text-2xl font-extrabold mt-1 leading-none text-white tabular-nums">{value}</p>
                  <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.50)" }}>{sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Stat Cards (Refined Color Scheme) ─── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 stagger-children">
          {[
            {
              label: "전체 공고",
              sub: "수집된 전체",
              value: summary.total.toLocaleString(),
              icon: FileText,
              color: "oklch(0.500 0.220 264)",
              glow: "oklch(0.500 0.220 264 / 15%)",
              textCls: "text-primary",
            },
            {
              label: "진행중",
              sub: "응찰 가능",
              value: summary.open_count.toLocaleString(),
              icon: TrendingUp,
              color: "oklch(0.500 0.220 264)",
              glow: "oklch(0.500 0.220 264 / 15%)",
              textCls: "text-primary",
            },
            {
              label: "마감 임박",
              sub: "D-3 이내",
              value: summary.urgent_count.toLocaleString(),
              icon: Clock,
              color: "oklch(0.700 0.160 55)",
              glow: "oklch(0.700 0.160 55 / 15%)",
              textCls: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "오늘 마감",
              sub: "D-DAY 공고",
              value: summary.closing_today.toLocaleString(),
              icon: Bell,
              color: "oklch(0.550 0.200 25)",
              glow: "oklch(0.550 0.200 25 / 15%)",
              textCls: "text-rose-600 dark:text-rose-400",
            },
            {
              label: "수집 예산",
              sub: "전체 합계",
              value: formatBudgetCompact(summary.total_budget),
              icon: Banknote,
              color: "oklch(0.500 0.220 264)",
              glow: "oklch(0.500 0.220 264 / 15%)",
              textCls: "text-primary",
            },
            {
              label: "진행중 예산",
              sub: "OPEN 합계",
              value: formatBudgetCompact(summary.open_budget),
              icon: Activity,
              color: "oklch(0.500 0.220 264)",
              glow: "oklch(0.500 0.220 264 / 15%)",
              textCls: "text-primary",
            },
          ].map(({ label, sub, value, icon: Icon, color, glow, textCls }) => (
            <Card
              key={label}
              className="stat-card-sm premium-card"
              style={{ "--stat-color": color, "--stat-glow": glow } as React.CSSProperties}
            >
              <CardContent className="pt-4 pb-3.5 px-4">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.07em] truncate">{label}</p>
                    <p className={`text-xl font-extrabold mt-1 tabular-nums tracking-tight leading-none ${textCls}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground/55 mt-1 truncate">{sub}</p>
                  </div>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-80"
                    style={{ background: `linear-gradient(135deg, oklch(from ${color} l c h / 15%), oklch(from ${color} l c h / 5%))` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Market Pulse Strip ─── */}
      {(data || summary) && (
        <div className="mkt-pulse">
          <div className="mkt-pulse-item">
            <span className="mkt-pulse-label">진행중 비율</span>
            <span className="mkt-pulse-value text-emerald-600 dark:text-emerald-400">
              {summary && summary.total > 0 ? Math.round((summary.open_count / summary.total) * 100) : 0}%
            </span>
            <span className="mkt-pulse-sub">{summary ? summary.open_count : "—"} / {summary ? summary.total : "—"}건</span>
          </div>
          <div className="mkt-pulse-item">
            <span className="mkt-pulse-label">수집 총예산</span>
            <span className="mkt-pulse-value">{summary ? formatBudgetCompact(summary.total_budget) : "—"}</span>
            <span className="mkt-pulse-sub">전체 기준</span>
          </div>
          <div className="mkt-pulse-item">
            <span className="mkt-pulse-label">진행중 예산</span>
            <span className="mkt-pulse-value text-violet-600 dark:text-violet-400">{summary ? formatBudgetCompact(summary.open_budget) : "—"}</span>
            <span className="mkt-pulse-sub">OPEN 공고 합계</span>
          </div>
          <div className="mkt-pulse-item hidden sm:flex">
            <span className="mkt-pulse-label">최대 단건</span>
            <span className="mkt-pulse-value">{formatBudgetCompact(maxBudgetInPage)}</span>
            <span className="mkt-pulse-sub">이 페이지 최고</span>
          </div>
          <div className="mkt-pulse-item hidden md:flex">
            <span className="mkt-pulse-label">전체 공고</span>
            <span className="mkt-pulse-value">{summary ? summary.total.toLocaleString() : "—"}건</span>
            <span className="mkt-pulse-sub">총 수집 공고</span>
          </div>
          <div className="mkt-pulse-item hidden lg:flex">
            <span className="mkt-pulse-label">다음 수집</span>
            <span className="mkt-pulse-value text-primary">09:00</span>
            <span className="mkt-pulse-sub">평일 자동 수집</span>
          </div>
        </div>
      )}

      {/* ─── AI 인사이트 섹션 ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-base font-bold">AI 입찰 인사이트</h2>
            <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
              Beta
            </span>
          </div>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            전체 분석 <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 4개 AI 카드 탭 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 추천 공고 */}
          <AIInsightCard
            title="AI 추천 공고"
            subtitle="종합 점수 상위"
            icon={<Sparkles className="h-4 w-4" />}
            colorClass="text-violet-600 dark:text-violet-400"
            bgClass="bg-violet-500/10"
            items={aiInsights?.recommended ?? []}
            isLoading={aiLoading}
            getScore={(item) => `${item.total_score ?? item.win_probability ?? 0}점`}
          />
          {/* 낙찰 가능성 높은 공고 */}
          <AIInsightCard
            title="낙찰 가능성 높음"
            subtitle="기회 점수 60 이상"
            icon={<Target className="h-4 w-4" />}
            colorClass="text-emerald-600 dark:text-emerald-400"
            bgClass="bg-emerald-500/10"
            items={aiInsights?.high_probability ?? []}
            isLoading={aiLoading}
            getScore={(item) => `${item.win_probability ?? 0}점`}
          />
          {/* 경쟁 적은 공고 */}
          <AIInsightCard
            title="경쟁 적은 공고"
            subtitle="평균 경쟁업체 최소"
            icon={<Users className="h-4 w-4" />}
            colorClass="text-blue-600 dark:text-blue-400"
            bgClass="bg-blue-500/10"
            items={aiInsights?.low_competition ?? []}
            isLoading={aiLoading}
            getScore={(item) =>
              item.avg_bidders != null ? `평균 ${item.avg_bidders}개` : "경쟁↓"
            }
          />
          {/* 수익성 높은 공고 */}
          <AIInsightCard
            title="수익성 높은 공고"
            subtitle="예산 × 기회 점수"
            icon={<Award className="h-4 w-4" />}
            colorClass="text-amber-600 dark:text-amber-400"
            bgClass="bg-amber-500/10"
            items={aiInsights?.high_profitability ?? []}
            isLoading={aiLoading}
            getScore={(item) => `${item.total_score ?? item.win_probability ?? 0}점`}
          />
        </div>
      </div>

      {/* ─── Category Chips ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0">카테고리</span>
        {CATEGORY_CHIPS.map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleCategoryChip(value)}
            className={`category-chip ${activeCategory === value ? "active" : ""}`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Trending Keywords ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-primary" />
          인기 검색
        </span>
        {TRENDING.map((kw) => (
          <button
            key={kw}
            onClick={() => { setQ(kw); setPage(1); setActiveCategory(""); }}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 hover:bg-primary/8 hover:border-primary/30 hover:text-primary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all duration-150"
          >
            {kw}
          </button>
        ))}
      </div>

      {/* ─── Filter Panel ─── */}
      <Card className="premium-card overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">검색 필터</span>
              {hasFilters && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  필터 적용됨
                </span>
              )}
            </div>
            {hasFilters && (
              <button
                onClick={() => { setQ(""); setStatus(""); setActiveCategory(""); setPage(1); }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" /> 초기화
              </button>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="공고명, 기관명, 키워드로 검색..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="pl-10 h-11 rounded-xl bg-muted/30 border-border/60 focus:bg-background transition-colors"
              />
            </div>
            <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-40 h-11 rounded-xl">
                <SelectValue placeholder="상태 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 상태</SelectItem>
                <SelectItem value="OPEN">진행중</SelectItem>
                <SelectItem value="CLOSED">마감</SelectItem>
                <SelectItem value="RESULT">결과발표</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-44 h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published_at">공고일순</SelectItem>
                <SelectItem value="deadline_at">마감일순</SelectItem>
                <SelectItem value="budget_amount">예산순</SelectItem>
                <SelectItem value="created_at">수집일순</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {debouncedQ && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary font-medium">
                  검색: {debouncedQ}
                  <button onClick={() => { setQ(""); setActiveCategory(""); }} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {status && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  상태: {status === "OPEN" ? "진행중" : status === "CLOSED" ? "마감" : "결과발표"}
                  <button onClick={() => setStatus("")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Loading ─── */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-27 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* ─── Error ─── */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-8 text-center text-destructive">
            데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </CardContent>
        </Card>
      )}

      {/* ─── Result Meta ─── */}
      {data && !isLoading && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-semibold text-foreground">{data.total.toLocaleString()}</span>건
            {debouncedQ && <span className="ml-1">· &ldquo;<span className="text-primary font-medium">{debouncedQ}</span>&rdquo; 검색결과</span>}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {page} / {totalPages || 1} 페이지
            </p>
            <div className="flex rounded-lg border border-border/60 overflow-hidden">
              <button
                onClick={() => { setViewMode("table"); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="테이블 뷰"
              >
                <Table2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">테이블</span>
              </button>
              <button
                onClick={() => { setViewMode("card"); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border/60 ${viewMode === "card" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="카드 뷰"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">카드</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Table View ─── */}
      {data && data.data.length > 0 && viewMode === "table" && (
        <Card className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-8 text-[10px] text-muted-foreground/40 text-center">#</TableHead>
                <TableHead className="w-20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">상태</TableHead>
                <TableHead
                  className={`text-[11px] font-semibold uppercase tracking-wider text-muted-foreground th-sort${sortBy === "published_at" ? " th-active" : ""}`}
                  onClick={() => handleTableSort("published_at")}
                >
                  공고명{sortBy === "published_at" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}
                </TableHead>
                <TableHead className="w-36 hidden md:table-cell text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">발주기관</TableHead>
                <TableHead className="w-20 hidden lg:table-cell text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">지역</TableHead>
                <TableHead
                  className={`w-40 hidden sm:table-cell text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right th-sort${sortBy === "budget_amount" ? " th-active" : ""}`}
                  onClick={() => handleTableSort("budget_amount")}
                >
                  예산{sortBy === "budget_amount" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}
                </TableHead>
                <TableHead
                  className={`w-24 hidden xl:table-cell text-[11px] font-semibold uppercase tracking-wider text-muted-foreground th-sort${sortBy === "published_at" ? " th-active" : ""}`}
                  onClick={() => handleTableSort("published_at")}
                >
                  공고일{sortBy === "published_at" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}
                </TableHead>
                <TableHead
                  className={`w-28 hidden sm:table-cell text-[11px] font-semibold uppercase tracking-wider text-muted-foreground th-sort${sortBy === "deadline_at" ? " th-active" : ""}`}
                  onClick={() => handleTableSort("deadline_at")}
                >
                  마감일{sortBy === "deadline_at" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}
                </TableHead>
                <TableHead className="w-16 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">D-day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((tender, idx) => {
                const dday = getDday(tender.deadline_at ?? null);
                const isUrgent = dday?.cls === "dday-urgent";
                const agencyName = (tender.agency as unknown as { name: string } | null)?.name
                  || tender.demand_agency_name;
                return (
                  <TableRow
                    key={tender.id}
                    className={`border-border/40 cursor-pointer transition-colors hover:bg-primary/4 ${isUrgent ? "bg-rose-500/3" : ""}`}
                    onClick={() => router.push(`/tenders/${tender.id}`)}
                  >
                    <TableCell className="py-2.5 text-center text-[11px] text-muted-foreground/35 tabular-nums font-mono">
                      {(page - 1) * PAGE_SIZE_TABLE + idx + 1}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        variant={statusColor(tender.status)}
                        className="rounded-md font-semibold text-[11px] h-5 whitespace-nowrap"
                      >
                        {tenderStatusLabel(tender.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 max-w-0">
                      <div className="flex items-start gap-1.5">
                        <span className="font-medium text-sm leading-snug line-clamp-2 min-w-0 flex-1 hover:text-primary transition-colors">
                          {tender.title}
                        </span>
                        {isNew(tender.published_at ?? null) && !dday && (
                          <span className="badge-new shrink-0 mt-0.5">신규</span>
                        )}
                      </div>
                      {tender.industry_name && (
                        <span className="mt-0.5 inline-block text-[10px] text-muted-foreground/70">
                          {tender.industry_name}{tender.method_type ? ` · ${tender.method_type}` : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground line-clamp-1">{agencyName || "-"}</span>
                    </TableCell>
                    <TableCell className="py-2.5 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{tender.region_name || "-"}</span>
                    </TableCell>
                    <TableCell className="py-2.5 hidden sm:table-cell text-right">
                      <span className="text-sm font-bold text-primary tabular-nums">{formatKRW(tender.budget_amount)}</span>
                      {tender.budget_amount ? (
                        <div className="bgt-bar-track">
                          <div className="bgt-bar-fill" style={{ width: `${Math.round((tender.budget_amount / maxBudgetInPage) * 100)}%` }} />
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-2.5 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatRawDate(tender.raw_json, "bidNtceDt", tender.published_at)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 hidden sm:table-cell">
                      <span className={`text-xs tabular-nums ${isUrgent ? "text-rose-500 font-medium" : "text-muted-foreground"}`}>
                        {formatRawDate(tender.raw_json, "bidClseDt", tender.deadline_at)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {dday ? (
                        <span className={dday.cls}>{dday.label}</span>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── Tender List (Card View) ─── */}
      {data && data.data.length > 0 && viewMode === "card" && (
        <div className="space-y-3 stagger-children">
          {data.data.map((tender) => {
            const dday = getDday(tender.deadline_at ?? null);
            const isUrgent = dday?.cls === "dday-urgent";
            return (
              <Link key={tender.id} href={`/tenders/${tender.id}`}>
                <Card className={`group premium-card card-hover cursor-pointer overflow-hidden ${isUrgent ? "border-rose-500/20" : ""}`}>
                  {isUrgent && <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, rgba(239,68,68,0.6), rgba(251,146,60,0.6), rgba(239,68,68,0.4))" }} />}
                  {!isUrgent && tender.status === "OPEN" && <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, rgba(34,197,94,0.5), rgba(52,211,153,0.3), transparent)" }} />}
                  <CardContent className="py-4 px-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <Badge
                            variant={statusColor(tender.status)}
                            className="rounded-md font-semibold text-[11px] h-5"
                          >
                            {tenderStatusLabel(tender.status)}
                          </Badge>
                          {tender.method_type && (
                            <Badge variant="outline" className="text-[11px] rounded-md h-5">
                              {tender.method_type}
                            </Badge>
                          )}
                          {tender.industry_name && (
                            <span className="inline-flex items-center rounded-full bg-muted/70 border border-border/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {tender.industry_name}
                            </span>
                          )}
                          {dday && (
                            <span className={dday.cls}>{dday.label}</span>
                          )}
                          {isNew(tender.published_at ?? null) && !dday && (
                            <span className="badge-new">신규</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-[14px] sm:text-[15px] line-clamp-2 group-hover:text-primary transition-colors duration-200 leading-snug">
                          {tender.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                          {(tender.agency as unknown as { name: string } | null)?.name && (
                            <span className="flex items-center gap-1.5">
                              <Building className="h-3.5 w-3.5 opacity-55 shrink-0" />
                              <span className="line-clamp-1">{(tender.agency as unknown as { name: string }).name}</span>
                            </span>
                          )}
                          {tender.region_name && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 opacity-55 shrink-0" />
                              {tender.region_name}
                            </span>
                          )}
                          {tender.deadline_at && (
                            <span className={`flex items-center gap-1.5 ${isUrgent ? "text-rose-500 dark:text-rose-400 font-medium" : ""}`}>
                              <Clock className="h-3.5 w-3.5 opacity-55 shrink-0" />
                              마감: {formatRawDate(tender.raw_json, "bidClseDt", tender.deadline_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1 min-w-20 sm:min-w-25">
                        <p className="font-extrabold text-base sm:text-lg tracking-tight text-primary tabular-nums">
                          {formatKRW(tender.budget_amount)}
                        </p>
                        {tender.published_at && (
                          <p className="text-[11px] text-muted-foreground hidden sm:block">
                            공고: {formatRawDate(tender.raw_json, "bidNtceDt", tender.published_at)}
                          </p>
                        )}
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/0 group-hover:bg-primary/10 transition-all mt-1">
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-all" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* ─── Empty State ─── */}
      {data && data.data.length === 0 && (
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="py-16 flex flex-col items-center text-center text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-5">
              <Search className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-lg font-semibold text-foreground">검색 결과가 없습니다</p>
            <p className="mt-1 text-sm max-w-xs">다른 키워드로 검색하거나 필터를 초기화해보세요</p>
            <div className="flex gap-2 mt-5">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setQ(""); setStatus(""); setActiveCategory(""); setPage(1); }}>
                <X className="h-3.5 w-3.5 mr-1" /> 필터 초기화
              </Button>
              <Button size="sm" className="rounded-xl" onClick={() => { setQ("AI"); setPage(1); }}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> AI 공고 검색
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <p className="w-full text-xs text-muted-foreground mb-1">추천 검색어</p>
              {TRENDING.map((kw) => (
                <button
                  key={kw}
                  onClick={() => { setQ(kw); setPage(1); }}
                  className="rounded-full border border-border/60 bg-background hover:bg-primary/8 hover:border-primary/30 hover:text-primary px-3 py-1 text-xs font-medium text-muted-foreground transition-all"
                >
                  {kw}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-4 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            className="gap-1 rounded-xl px-3 h-10 border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
            onClick={() => setPage(1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <ChevronLeft className="h-3.5 w-3.5 -ml-2.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            className="gap-1 rounded-xl px-3 h-10 border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>

          <div className="flex items-center gap-1">
            {(() => {
              const half = 3;
              let start = Math.max(1, page - half);
              let end = Math.min(totalPages, page + half);
              if (end - start < half * 2) {
                start = Math.max(1, end - half * 2);
                end = Math.min(totalPages, start + half * 2);
              }
              const pages: (number | "…")[] = [];
              if (start > 1) { pages.push(1); if (start > 2) pages.push("…"); }
              for (let n = start; n <= end; n++) pages.push(n);
              if (end < totalPages) { if (end < totalPages - 1) pages.push("…"); pages.push(totalPages); }
              return pages.map((item, i) =>
                item === "…" ? (
                  <span key={`e${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === page ? "default" : "ghost"}
                    size="icon"
                    className={`h-10 w-10 rounded-xl text-sm font-semibold ${
                      item === page ? "btn-premium text-white shadow-md" : "hover:bg-primary/5 hover:text-primary"
                    }`}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </Button>
                )
              );
            })()}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            className="gap-1 rounded-xl px-3 h-10 border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
            onClick={() => setPage((p) => p + 1)}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            className="gap-1 rounded-xl px-3 h-10 border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
            onClick={() => setPage(totalPages)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
            <ChevronRight className="h-3.5 w-3.5 -ml-2.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── AIInsightCard 컴포넌트 ─────────────────────────────────────────────────

import type { AIInsightTender } from "@/lib/types";

const DATA_QUALITY_BADGE = {
  real:        { label: "실제 데이터", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  partial:     { label: "추정값",    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  insufficient:{ label: "데이터 부족",className: "bg-muted/60 text-muted-foreground border-border/40" },
} as const;

interface AIInsightCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  items: AIInsightTender[];
  isLoading: boolean;
  getScore: (item: AIInsightTender) => string;
}

function AIInsightCard({
  title,
  subtitle,
  icon,
  colorClass,
  bgClass,
  items,
  isLoading,
  getScore,
}: AIInsightCardProps) {
  return (
    <Card className="premium-card flex flex-col">
      <CardContent className="pt-4 pb-3 px-4 flex flex-col flex-1">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bgClass}`}>
            <span className={colorClass}>{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-none">{title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* 리스트 */}
        {isLoading ? (
          <div className="space-y-2 flex-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-25">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              낙찰 데이터 수집 중<br />
              <span className="text-[10px]">데이터 누적 후 표시됩니다</span>
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 flex-1">
            {items.slice(0, 4).map((item) => {
              const qBadge = DATA_QUALITY_BADGE[item.data_quality ?? "insufficient"];
              return (
                <Link
                  key={item.id}
                  href={`/tenders/${item.id}`}
                  className="block rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/50 hover:border-primary/20 transition-all p-2 group"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="text-[11px] font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1 min-w-0">
                      {item.title}
                    </p>
                    <span className={`shrink-0 text-[10px] font-bold ${colorClass} tabular-nums`}>
                      {getScore(item)}
                    </span>
                  </div>
                  {/* 추천 이유 */}
                  {item.reason && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                      {item.reason}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    {item.budget_amount && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {formatBudgetCompact(item.budget_amount)}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full border px-1.5 py-px text-[9px] font-medium ${qBadge.className}`}>
                      {qBadge.label}
                    </span>
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
