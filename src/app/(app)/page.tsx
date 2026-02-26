"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTenders } from "@/hooks/use-api";
import { formatKRW, tenderStatusLabel } from "@/lib/helpers";
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
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building,
  MapPin,
  TrendingUp,
  Clock,
  FileText,
  ArrowUpRight,
  Sparkles,
  Filter,
  SlidersHorizontal,
} from "lucide-react";

const PAGE_SIZE = 20;

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-xl" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
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

  const { data, isLoading, error } = useTenders({
    q: debouncedQ || undefined,
    status: (status as "OPEN" | "CLOSED" | "RESULT") || undefined,
    sortBy: sortBy as "published_at" | "deadline_at" | "budget_amount" | "created_at",
    sortOrder: "desc",
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const statusColor = (s: string) => {
    switch (s) {
      case "OPEN":
        return "default";
      case "CLOSED":
        return "secondary";
      case "RESULT":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Quick stats from data
  const openCount = data?.data.filter((t) => t.status === "OPEN").length ?? 0;
  const closingToday = data?.data.filter((t) => {
    if (!t.deadline_at) return false;
    const d = new Date(t.deadline_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length ?? 0;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ─── Hero Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-30%] left-[-10%] h-[300px] w-[300px] rounded-full bg-indigo-600/25 blur-[80px] animate-mesh" />
          <div className="absolute bottom-[-30%] right-[-10%] h-[350px] w-[350px] rounded-full bg-violet-600/20 blur-[100px] animate-mesh" style={{ animationDelay: "-8s" }} />
        </div>
        <div className="relative z-10 px-8 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3.5 py-1 text-xs font-medium text-white/80">
                <Sparkles className="h-3 w-3 text-amber-300" />
                AI 실시간 입찰 분석
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">입찰 공고 검색</h1>
              <p className="text-white/50 max-w-md">나라장터 공공 입찰 공고를 검색하고 AI로 분석하세요</p>
            </div>
            {data && (
              <p className="text-sm text-white/40 shrink-0">
                총 <span className="font-bold text-white/80">{data.total.toLocaleString()}</span>건
                {debouncedQ && (
                  <span className="ml-1.5">
                    · &ldquo;{debouncedQ}&rdquo; 검색
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Stats Cards ─── */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
          <Card className="stat-card premium-card" style={{ "--stat-color": "oklch(0.500 0.220 264)", "--stat-glow": "oklch(0.500 0.220 264 / 15%)" } as React.CSSProperties}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">전체 공고</p>
                  <p className="text-2xl font-extrabold mt-1.5 tracking-tight">{data.total.toLocaleString()}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card premium-card" style={{ "--stat-color": "oklch(0.600 0.180 165)", "--stat-glow": "oklch(0.600 0.180 165 / 15%)" } as React.CSSProperties}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">진행중</p>
                  <p className="text-2xl font-extrabold mt-1.5 tracking-tight text-emerald-600 dark:text-emerald-400">{openCount}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card premium-card" style={{ "--stat-color": "oklch(0.700 0.160 55)", "--stat-glow": "oklch(0.700 0.160 55 / 15%)" } as React.CSSProperties}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">오늘 마감</p>
                  <p className="text-2xl font-extrabold mt-1.5 tracking-tight text-amber-600 dark:text-amber-400">{closingToday}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card premium-card" style={{ "--stat-color": "oklch(0.550 0.200 320)", "--stat-glow": "oklch(0.550 0.200 320 / 15%)" } as React.CSSProperties}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">현재 페이지</p>
                  <p className="text-2xl font-extrabold mt-1.5 tracking-tight">{page} <span className="text-sm font-normal text-muted-foreground">/ {totalPages || 1}</span></p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-violet-500/5">
                  <Search className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Filter Panel ─── */}
      <Card className="premium-card overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">검색 필터</span>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="공고명, 기관명으로 검색..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="pl-10 h-11 rounded-xl bg-muted/30 border-border/60 focus:bg-background transition-colors"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40 h-11 rounded-xl">
                <SelectValue placeholder="상태 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="OPEN">진행중</SelectItem>
                <SelectItem value="CLOSED">마감</SelectItem>
                <SelectItem value="RESULT">결과발표</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
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
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-8 text-center text-destructive">
            데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
          </CardContent>
        </Card>
      )}

      {/* Result List */}
      {data && data.data.length > 0 && (
        <div className="space-y-3 stagger-children">
          {data.data.map((tender) => (
            <Link key={tender.id} href={`/tenders/${tender.id}`}>
              <Card className="group premium-card card-hover cursor-pointer overflow-hidden">
                <CardContent className="py-5 px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={statusColor(tender.status) as "default" | "secondary" | "outline"} className="rounded-md font-semibold text-[11px]">
                          {tenderStatusLabel(tender.status)}
                        </Badge>
                        {tender.method_type && (
                          <Badge variant="outline" className="text-[11px] rounded-md">
                            {tender.method_type}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-[15px] truncate group-hover:text-primary transition-colors duration-200">
                        {tender.title}
                      </h3>
                      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                        {(tender.agency as unknown as { name: string } | null)?.name && (
                          <span className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 opacity-60" />
                            {(tender.agency as unknown as { name: string }).name}
                          </span>
                        )}
                        {tender.region_name && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 opacity-60" />
                            {tender.region_name}
                          </span>
                        )}
                        {tender.deadline_at && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 opacity-60" />
                            마감: {new Date(tender.deadline_at).toLocaleDateString("ko-KR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-lg tracking-tight text-primary">
                        {formatKRW(tender.budget_amount)}
                      </p>
                      {tender.published_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tender.published_at).toLocaleDateString("ko-KR")}
                        </p>
                      )}
                      <div className="flex items-center justify-end mt-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/0 group-hover:bg-primary/10 transition-all">
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {data && data.data.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Search className="h-7 w-7 opacity-50" />
            </div>
            <p className="text-lg font-medium">검색 결과가 없습니다</p>
            <p className="mt-1 text-sm">다른 키워드로 검색해보세요</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            className="gap-1 rounded-xl px-4 h-10 border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <div className="flex items-center gap-1">
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const pageNum = page <= 3 ? i + 1 : page + i - 2;
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "ghost"}
                  size="icon"
                  className={`h-10 w-10 rounded-xl text-sm font-semibold ${
                    pageNum === page ? "btn-premium text-white shadow-md" : "hover:bg-primary/5 hover:text-primary"
                  }`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            className="gap-1 rounded-xl px-4 h-10 border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
            onClick={() => setPage((p) => p + 1)}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
