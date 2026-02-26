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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">입찰 공고 검색</h1>
          <p className="text-muted-foreground mt-1">
            나라장터 공공 입찰 공고를 검색하고 분석하세요
          </p>
        </div>
        {data && (
          <p className="text-sm text-muted-foreground">
            총 <span className="font-semibold text-foreground">{data.total.toLocaleString()}</span>건
            {debouncedQ && (
              <span className="ml-1.5">
                · &ldquo;{debouncedQ}&rdquo; 검색 결과
              </span>
            )}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
          <Card className="card-hover border-border/60">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">전체 공고</p>
                  <p className="text-2xl font-bold mt-1">{data.total.toLocaleString()}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover border-border/60">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">진행중</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{openCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover border-border/60">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">오늘 마감</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{closingToday}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover border-border/60">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">현재 페이지</p>
                  <p className="text-2xl font-bold mt-1">{page} <span className="text-base font-normal text-muted-foreground">/ {totalPages || 1}</span></p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Search className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Panel */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="공고명, 기관명으로 검색..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-11"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40 h-11">
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
              <SelectTrigger className="w-full md:w-44 h-11">
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
              <Card className="group card-hover border-border/60 cursor-pointer">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant={statusColor(tender.status) as "default" | "secondary" | "outline"}>
                          {tenderStatusLabel(tender.status)}
                        </Badge>
                        {tender.method_type && (
                          <Badge variant="outline" className="text-xs">
                            {tender.method_type}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {tender.title}
                      </h3>
                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {(tender.agency as unknown as { name: string } | null)?.name && (
                          <span className="flex items-center gap-1">
                            <Building className="h-3.5 w-3.5" />
                            {(tender.agency as unknown as { name: string }).name}
                          </span>
                        )}
                        {tender.region_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {tender.region_name}
                          </span>
                        )}
                        {tender.deadline_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            마감: {new Date(tender.deadline_at).toLocaleDateString("ko-KR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg tracking-tight">
                        {formatKRW(tender.budget_amount)}
                      </p>
                      {tender.published_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tender.published_at).toLocaleDateString("ko-KR")}
                        </p>
                      )}
                      <ArrowUpRight className="h-4 w-4 mt-2 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
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
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            className="gap-1 rounded-full px-4"
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <div className="flex items-center gap-1.5">
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const pageNum = page <= 3 ? i + 1 : page + i - 2;
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "ghost"}
                  size="icon"
                  className={`h-9 w-9 rounded-full text-sm ${
                    pageNum === page ? "shadow-sm" : ""
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
            className="gap-1 rounded-full px-4"
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
