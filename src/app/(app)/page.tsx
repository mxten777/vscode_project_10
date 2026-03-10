"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTenders } from "@/hooks/use-api";
import { formatKRW, tenderStatusLabel, formatRawDate } from "@/lib/helpers";
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

function getDday(deadline: string | null): { label: string; cls: string } | null {
  if (!deadline) return null;
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return null;
  if (diff === 0) return { label: "D-DAY", cls: "dday-urgent" };
  if (diff <= 3) return { label: `D-${diff}`, cls: "dday-urgent" };
  if (diff <= 7) return { label: `D-${diff}`, cls: "dday-warning" };
  return null;
}

function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  return Date.now() - new Date(publishedAt).getTime() < 48 * 60 * 60 * 1000;
}

function formatBudgetCompact(amount: number): string {
  if (!amount) return "-";
  if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(1)}조`;
  if (amount >= 100_000_000) return `${Math.round(amount / 100_000_000)}억`;
  if (amount >= 10_000_000) return `${Math.round(amount / 10_000_000)}천만`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000)}만`;
  return `${amount.toLocaleString()}원`;
}

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
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
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

  const totalPages = data ? Math.ceil(data.total / (viewMode === "table" ? PAGE_SIZE_TABLE : PAGE_SIZE_CARD)) : 0;

  const statusColor = (s: string): "default" | "secondary" | "outline" => {
    switch (s) {
      case "OPEN": return "default";
      case "CLOSED": return "secondary";
      case "RESULT": return "outline";
      default: return "secondary";
    }
  };

  const now = useMemo(() => new Date(), []);
  const openCount = data?.data.filter((t) => t.status === "OPEN").length ?? 0;
  const urgentCount = data?.data.filter((t) => {
    if (!t.deadline_at || t.status !== "OPEN") return false;
    const diff = Math.ceil((new Date(t.deadline_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 3;
  }).length ?? 0;
  const closingToday = data?.data.filter((t) => {
    if (!t.deadline_at) return false;
    return new Date(t.deadline_at).toDateString() === now.toDateString();
  }).length ?? 0;

  const totalBudget = data?.data.reduce((s, t) => s + (t.budget_amount || 0), 0) ?? 0;
  const openBudget = data?.data
    .filter((t) => t.status === "OPEN")
    .reduce((s, t) => s + (t.budget_amount || 0), 0) ?? 0;
  const maxBudgetInPage = Math.max(1, ...(data?.data.map((t) => t.budget_amount || 0) ?? [1]));

  const hasFilters = debouncedQ || status;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ─── Hero Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl hero-grid">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-950 via-indigo-900 to-violet-950" />
        <div className="noise-overlay" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-5%] h-70 w-70 rounded-full bg-indigo-500/30 blur-[90px] animate-mesh" />
          <div className="absolute bottom-[-20%] right-[-5%] h-80 w-80 rounded-full bg-violet-500/25 blur-[100px] animate-mesh" style={{ animationDelay: "-8s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-50 w-50 rounded-full bg-cyan-500/10 blur-[80px] animate-mesh" style={{ animationDelay: "-4s" }} />
        </div>
        {/* Floating keyword pills */}
        <span className="float-slow absolute top-6 right-[12%] hidden lg:inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1 text-xs text-white/70 font-medium">
          <Zap className="h-3 w-3 text-amber-300" /> AI분석
        </span>
        <span className="float-slow-rev absolute top-14 right-[28%] hidden lg:inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1 text-xs text-white/70 font-medium">
          <TrendingUp className="h-3 w-3 text-emerald-300" /> 실시간
        </span>
        <span className="float-slow-2 absolute bottom-10 right-[8%] hidden lg:inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1 text-xs text-white/70 font-medium">
          <BarChart3 className="h-3 w-3 text-cyan-300" /> 빅데이터
        </span>
        <span className="float-slow-3 absolute bottom-16 right-[24%] hidden xl:inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1 text-xs text-white/70 font-medium">
          <Star className="h-3 w-3 text-rose-300" /> 낙찰예측
        </span>

        <div className="relative z-10 px-8 py-10 sm:px-12 sm:py-12">
          <div className="flex flex-col gap-5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="live-dot" />
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3.5 py-1 text-xs font-semibold text-white/85">
                <Sparkles className="h-3 w-3 text-amber-300" />
                AI 실시간 입찰 분석 플랫폼
              </span>
            </div>
            <div>
              <h1 className="text-3xl sm:text-[2.6rem] font-extrabold text-white tracking-tight leading-[1.15]">
                공공 입찰 공고를<br />
                <span className="bg-linear-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
                  스마트하게 검색
                </span>
              </h1>
              <p className="mt-3 text-white/55 text-base max-w-md">
                나라장터 실시간 공고 수집 · AI 분석 · 마감 알림까지 한 곳에서
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { icon: FileText, label: `공고 ${data ? data.total.toLocaleString() : "—"}건` },
                { icon: TrendingUp, label: `진행중 ${openCount}건` },
                { icon: Clock, label: `마감임박 ${urgentCount}건` },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-medium text-white/75">
                  <Icon className="h-3 w-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stat Cards (6-up) ─── */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 stagger-children">
          {[
            {
              label: "전체 공고",
              sub: "수집된 전체",
              value: data.total.toLocaleString(),
              icon: FileText,
              color: "oklch(0.500 0.220 264)",
              glow: "oklch(0.500 0.220 264 / 15%)",
              textCls: "",
            },
            {
              label: "진행중",
              sub: "응찰 가능",
              value: String(openCount),
              icon: TrendingUp,
              color: "oklch(0.600 0.180 165)",
              glow: "oklch(0.600 0.180 165 / 15%)",
              textCls: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "마감 임박",
              sub: "D-3 이내",
              value: String(urgentCount),
              icon: Clock,
              color: "oklch(0.700 0.160 55)",
              glow: "oklch(0.700 0.160 55 / 15%)",
              textCls: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "오늘 마감",
              sub: "D-DAY 공고",
              value: String(closingToday),
              icon: Bell,
              color: "oklch(0.550 0.200 25)",
              glow: "oklch(0.550 0.200 25 / 15%)",
              textCls: "text-rose-600 dark:text-rose-400",
            },
            {
              label: "수집 예산",
              sub: "이 페이지 합계",
              value: formatBudgetCompact(totalBudget),
              icon: Banknote,
              color: "oklch(0.550 0.200 300)",
              glow: "oklch(0.550 0.200 300 / 15%)",
              textCls: "text-violet-600 dark:text-violet-400",
            },
            {
              label: "진행중 예산",
              sub: "OPEN 합계",
              value: formatBudgetCompact(openBudget),
              icon: Activity,
              color: "oklch(0.520 0.200 215)",
              glow: "oklch(0.520 0.200 215 / 15%)",
              textCls: "text-cyan-600 dark:text-cyan-400",
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
      {data && (
        <div className="mkt-pulse">
          <div className="mkt-pulse-item">
            <span className="mkt-pulse-label">진행중 비율</span>
            <span className="mkt-pulse-value text-emerald-600 dark:text-emerald-400">
              {data.data.length > 0 ? Math.round((openCount / data.data.length) * 100) : 0}%
            </span>
            <span className="mkt-pulse-sub">{openCount} / {data.data.length}건</span>
          </div>
          <div className="mkt-pulse-item">
            <span className="mkt-pulse-label">수집 총예산</span>
            <span className="mkt-pulse-value">{formatBudgetCompact(totalBudget)}</span>
            <span className="mkt-pulse-sub">이 페이지 기준</span>
          </div>
          <div className="mkt-pulse-item">
            <span className="mkt-pulse-label">진행중 예산</span>
            <span className="mkt-pulse-value text-violet-600 dark:text-violet-400">{formatBudgetCompact(openBudget)}</span>
            <span className="mkt-pulse-sub">OPEN 공고 합계</span>
          </div>
          <div className="mkt-pulse-item hidden sm:flex">
            <span className="mkt-pulse-label">최대 단건</span>
            <span className="mkt-pulse-value">{formatBudgetCompact(maxBudgetInPage)}</span>
            <span className="mkt-pulse-sub">최고 예산 공고</span>
          </div>
          <div className="mkt-pulse-item hidden md:flex">
            <span className="mkt-pulse-label">전체 공고</span>
            <span className="mkt-pulse-value">{data.total.toLocaleString()}건</span>
            <span className="mkt-pulse-sub">총 수집 공고</span>
          </div>
          <div className="mkt-pulse-item hidden lg:flex">
            <span className="mkt-pulse-label">다음 수집</span>
            <span className="mkt-pulse-value text-primary">09:00</span>
            <span className="mkt-pulse-sub">평일 자동 수집</span>
          </div>
        </div>
      )}

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
                  {isUrgent && <div className="h-0.5 w-full bg-linear-to-r from-rose-500/60 via-orange-400/60 to-rose-500/40" />}
                  {!isUrgent && tender.status === "OPEN" && <div className="h-0.5 w-full bg-linear-to-r from-emerald-500/50 via-emerald-400/30 to-transparent" />}
                  <CardContent className="py-4 px-6">
                    <div className="flex items-start justify-between gap-4">
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
                        <h3 className="font-semibold text-[15px] line-clamp-2 group-hover:text-primary transition-colors duration-200 leading-snug">
                          {tender.title}
                        </h3>
                        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {(tender.agency as unknown as { name: string } | null)?.name && (
                            <span className="flex items-center gap-1.5">
                              <Building className="h-3.5 w-3.5 opacity-55" />
                              {(tender.agency as unknown as { name: string }).name}
                            </span>
                          )}
                          {tender.region_name && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 opacity-55" />
                              {tender.region_name}
                            </span>
                          )}
                          {tender.deadline_at && (
                            <span className={`flex items-center gap-1.5 ${isUrgent ? "text-rose-500 dark:text-rose-400 font-medium" : ""}`}>
                              <Clock className="h-3.5 w-3.5 opacity-55" />
                              마감: {formatRawDate(tender.raw_json, "bidClseDt", tender.deadline_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="font-extrabold text-lg tracking-tight text-primary tabular-nums">
                          {formatKRW(tender.budget_amount)}
                        </p>
                        {tender.published_at && (
                          <p className="text-xs text-muted-foreground">
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
