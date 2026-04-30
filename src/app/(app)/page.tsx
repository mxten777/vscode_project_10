"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ApiError, useCreateAlertRule, useCreateSavedSearch, useDeleteSavedSearch, useSavedSearches, useTenders, useTenderSummary, useAIInsights, useTrendingKeywords, useUpdateSavedSearch } from "@/hooks/use-api";
import type { SavedSearch } from "@/lib/types";
import { formatKRW, tenderStatusLabel, formatRawDate, getDday, isNew, formatBudgetCompact } from "@/lib/helpers";
import { UpgradeModal, usePlanLimit } from "@/components/upgrade-modal";
import { WorkflowGuide } from "@/components/workflow-guide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

import {
  Search,
  ChevronLeft,
  ChevronRight,
  Building,
  MapPin,
  TrendingUp,
  Clock,
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
  Target,
  Users,
  Award,
  BookmarkPlus,
  History,
  Trash2,
  BellPlus,
  Pencil,
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [editingSavedSearch, setEditingSavedSearch] = useState<SavedSearch | null>(null);

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

  const { data: savedSearches = [] } = useSavedSearches();
  const createSavedSearch = useCreateSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();
  const updateSavedSearch = useUpdateSavedSearch();
  const createAlertRule = useCreateAlertRule();
  const { limitModalProps, openModal } = usePlanLimit("알림 규칙", 3);

  const resetSaveDialog = () => {
    setSavedSearchName("");
    setEditingSavedSearch(null);
    setSaveDialogOpen(false);
  };

  const buildCurrentSearchPayload = () => {
    const normalizedQ = q.trim();
    return {
      normalizedQ,
      query_json: {
        ...(normalizedQ ? { q: normalizedQ } : {}),
        ...(status ? { status: status as "OPEN" | "CLOSED" | "RESULT" } : {}),
        sortBy: sortBy as "published_at" | "deadline_at" | "budget_amount" | "created_at",
        sortOrder,
      },
    };
  };

  const applySavedSearch = (search: SavedSearch) => {
    setQ(search.query_json.q ?? "");
    setStatus(search.query_json.status ?? "");
    setSortBy(search.query_json.sortBy ?? "published_at");
    setSortOrder(search.query_json.sortOrder ?? "desc");
    setActiveCategory("");
    setPage(1);
    toast.success(`"${search.name}" 검색을 불러왔습니다`);
  };

  const removeSavedSearch = async (id: string) => {
    try {
      await deleteSavedSearch.mutateAsync(id);
      toast.success("저장한 검색을 삭제했습니다");
    } catch {
      toast.error("저장한 검색을 삭제하지 못했습니다");
    }
  };

  const createAlertFromSavedSearch = async (search: SavedSearch) => {
    const keyword = search.query_json.q?.trim();
    const savedStatus = search.query_json.status;

    if (!keyword && !savedStatus) {
      toast.error("키워드나 상태가 있는 저장 검색만 알림으로 전환할 수 있습니다");
      return;
    }

    try {
      await createAlertRule.mutateAsync({
        type: savedStatus ? "FILTER" : "KEYWORD",
        name: `${search.name} 알림`,
        rule_json: {
          ...(keyword ? { keyword } : {}),
          ...(savedStatus ? { statuses: [savedStatus] } : {}),
        },
        channel: "EMAIL",
        is_enabled: true,
      });
      toast.success(`"${search.name}" 검색을 알림 규칙으로 저장했습니다`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "PLAN_LIMIT") {
        openModal();
        return;
      }
      toast.error(error instanceof Error ? error.message : "알림 규칙 생성 실패");
    }
  };

  const startEditingSavedSearch = (search: SavedSearch) => {
    setEditingSavedSearch(search);
    setSavedSearchName(search.name);
    setSaveDialogOpen(true);
  };

  const handleSaveCurrentSearch = async () => {
    const { normalizedQ, query_json } = buildCurrentSearchPayload();
    if (!normalizedQ && !status) {
      toast.error("키워드나 상태를 먼저 선택한 뒤 저장해 주세요");
      return;
    }

    const fallbackName = normalizedQ || (status === "OPEN" ? "진행중 공고" : status === "CLOSED" ? "마감 공고" : "결과 공고");
    const name = savedSearchName.trim() || fallbackName;

    const duplicate = savedSearches.find(
      (item) =>
        item.id !== editingSavedSearch?.id &&
        (item.query_json.q ?? "") === normalizedQ &&
        (item.query_json.status ?? "") === status &&
        (item.query_json.sortBy ?? "published_at") === sortBy &&
        (item.query_json.sortOrder ?? "desc") === sortOrder
    );

    if (duplicate) {
      toast.error("같은 조건의 저장 검색이 이미 있습니다");
      return;
    }

    try {
      if (editingSavedSearch) {
        await updateSavedSearch.mutateAsync({
          id: editingSavedSearch.id,
          name,
          query_json,
        });
        toast.success("저장한 검색을 수정했습니다");
      } else {
        await createSavedSearch.mutateAsync({
          name,
          query_json,
        });
        toast.success("현재 검색을 저장했습니다");
      }
      resetSaveDialog();
    } catch (error) {
      if (error instanceof ApiError && error.code === "LIMIT_REACHED") {
        toast.error(error.message);
        return;
      }
      toast.error(error instanceof Error ? error.message : editingSavedSearch ? "저장한 검색 수정 실패" : "저장한 검색 생성 실패");
    }
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
  const { data: trendingKeywords } = useTrendingKeywords(7, 8);

  // 실데이터 기반 트렌딩 키워드 (없으면 업종 카테고리 칩으로 대체)
  const trendingLabels =
    trendingKeywords && trendingKeywords.length > 0
      ? trendingKeywords.map((k) => k.keyword)
      : null;

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
      <UpgradeModal {...limitModalProps} />

      <WorkflowGuide
        currentStep={0}
        title="지금은 후보 공고를 빠르게 좁히는 단계입니다"
        description="먼저 검토할 공고를 정한 뒤, 다음으로 상세 화면에서 판단 근거를 확인하면 됩니다."
        helper="기대 결과: 오늘 먼저 검토할 공고를 빠르게 정할 수 있습니다."
        actions={[
          { label: "저장한 공고 보기", href: "/favorites", variant: "outline" },
          { label: "분석 화면 바로가기", href: "/analytics", variant: "ghost" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="premium-card overflow-hidden border-primary/15 bg-linear-to-br from-background via-background to-primary/5">
          <CardContent className="px-6 py-6 sm:px-7 sm:py-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/6 px-3 py-1 text-xs font-semibold text-primary">
              <Target className="h-3.5 w-3.5" />
              오늘 검토할 공고 찾기
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight leading-tight sm:text-4xl">
              많은 정보를 보기보다,
              <span className="block text-primary">먼저 볼 공고를 빠르게 좁히세요</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              이 화면의 목적은 대시보드를 보는 것이 아니라 오늘 검토할 공고를 찾는 것입니다.
              키워드와 상태로 후보를 좁히고, 상세 화면에서 판단 근거를 확인한 뒤 저장이나 알림으로 이어가면 됩니다.
            </p>

            {summary && (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "전체 공고", value: summary.total.toLocaleString(), sub: "수집된 전체" },
                  { label: "진행중", value: summary.open_count.toLocaleString(), sub: "응찰 가능" },
                  { label: "마감 임박", value: summary.urgent_count.toLocaleString(), sub: "D-3 이내" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-border/60 bg-background/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">빠른 시작</p>
              <div className="mt-3 flex flex-wrap gap-2">
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
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  {trendingLabels ? "최근 많이 보는 키워드" : "추천 검색어"}
                </span>
                {(trendingLabels ?? ["플랫폼", "정보화시스템", "시설유지보수", "운영 용역", "디지털전환", "클라우드"]).map((kw) => (
                  <button
                    key={kw}
                    onClick={() => { setQ(kw); setPage(1); setActiveCategory(""); }}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/35 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all duration-150 hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card overflow-hidden">
          <CardContent className="px-6 py-6 sm:px-7 sm:py-7">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">검색과 필터</span>
                {hasFilters && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    필터 적용됨
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={saveDialogOpen} onOpenChange={(open) => {
                  if (!open) {
                    resetSaveDialog();
                    return;
                  }
                  setSaveDialogOpen(true);
                }}>
                  <DialogTrigger asChild>
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                      onClick={() => {
                        setEditingSavedSearch(null);
                        setSavedSearchName("");
                      }}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" /> 저장
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingSavedSearch ? "저장한 검색 수정" : "현재 검색 저장"}</DialogTitle>
                      <DialogDescription>
                        {editingSavedSearch
                          ? "현재 화면 조건으로 저장한 검색을 덮어씁니다. 이름도 함께 수정할 수 있습니다."
                          : "지금 보고 있는 키워드와 상태 조건을 다시 불러올 수 있게 저장합니다."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <Input
                        value={savedSearchName}
                        onChange={(e) => setSavedSearchName(e.target.value)}
                        placeholder={q.trim() || "예: 진행중 플랫폼 공고"}
                        className="h-11"
                      />
                      <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <p>키워드: <span className="font-medium text-foreground">{q.trim() || "없음"}</span></p>
                        <p className="mt-1">상태: <span className="font-medium text-foreground">{status ? tenderStatusLabel(status as "OPEN" | "CLOSED" | "RESULT") : "전체"}</span></p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={resetSaveDialog}>취소</Button>
                      <Button className="btn-premium text-white" onClick={() => void handleSaveCurrentSearch()} disabled={createSavedSearch.isPending || updateSavedSearch.isPending}>{editingSavedSearch ? "수정하기" : "저장하기"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {hasFilters && (
                  <button
                    onClick={() => { setQ(""); setStatus(""); setActiveCategory(""); setPage(1); }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" /> 초기화
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">업무 순서</span>
              <span className="ml-2">1. 키워드 입력</span>
              <span className="mx-2 text-border">/</span>
              <span>2. 상태와 정렬로 좁히기</span>
              <span className="mx-2 text-border">/</span>
              <span>3. 상세 화면에서 판단 근거 확인</span>
            </div>

            <div className="flex flex-col gap-3">
              {savedSearches.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    저장한 검색
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {savedSearches.map((item) => (
                      <div
                        key={item.id}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 pl-3 pr-1 py-1 text-xs"
                      >
                        <button
                          onClick={() => applySavedSearch(item)}
                          className="font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {item.name}
                        </button>
                        <button
                          onClick={() => startEditingSavedSearch(item)}
                          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                          aria-label={`${item.name} 수정`}
                          title="이 저장 검색 수정"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => void createAlertFromSavedSearch(item)}
                          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          aria-label={`${item.name} 알림 만들기`}
                          title="이 검색으로 알림 만들기"
                        >
                          <BellPlus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => void removeSavedSearch(item.id)}
                          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${item.name} 삭제`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="예: 플랫폼, AI, 용역, 기관명으로 검색"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  className="h-12 rounded-xl border-border/60 bg-muted/25 pl-10 text-sm focus:bg-background transition-colors"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
                <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="h-11 rounded-xl">
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
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published_at">공고일순</SelectItem>
                    <SelectItem value="deadline_at">마감일순</SelectItem>
                    <SelectItem value="budget_amount">예산순</SelectItem>
                    <SelectItem value="created_at">수집일순</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden xl:flex items-center justify-end text-xs text-muted-foreground rounded-xl border border-border/60 bg-muted/20 px-3">
                  최대 단건 {formatBudgetCompact(maxBudgetInPage)}
                </div>
              </div>
            </div>

            {hasFilters && (
              <div className="mt-4 flex flex-wrap gap-1.5">
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
      </div>

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
            공고 목록을 불러오지 못했습니다. 잠시 후 다시 시도하거나 검색 조건을 줄여보세요.
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
            <p className="mt-1 text-sm max-w-xs">조건이 너무 좁을 수 있습니다. 다른 키워드로 찾거나 상태 필터를 넓혀보세요.</p>
            <div className="flex gap-2 mt-5">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setQ(""); setStatus(""); setActiveCategory(""); setPage(1); }}>
                <X className="h-3.5 w-3.5 mr-1" /> 필터 초기화
              </Button>
              <Button size="sm" className="rounded-xl" onClick={() => { setQ("플랫폼"); setPage(1); }}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> 플랫폼 공고 보기
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <p className="w-full text-xs text-muted-foreground mb-1">다시 시작할 때 추천하는 검색어</p>
              {(trendingLabels ?? ["플랫폼", "정보화시스템", "시설유지보수", "운영 용역", "디지털전환", "클라우드"]).map((kw) => (
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

      {/* ─── 참고 인사이트 섹션 ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-base font-bold">참고 인사이트</h2>
            <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
              Beta
            </span>
          </div>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            전체 분석 <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          검색과 선별을 마친 뒤, 참고용으로 볼 수 있는 요약 인사이트입니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <AIInsightCard
            title="추천 공고"
            subtitle="종합 점수 상위"
            icon={<Sparkles className="h-4 w-4" />}
            colorClass="text-violet-600 dark:text-violet-400"
            bgClass="bg-violet-500/10"
            items={aiInsights?.recommended ?? []}
            isLoading={aiLoading}
            getScore={(item) => `${item.total_score ?? item.win_probability ?? 0}점`}
          />
          <AIInsightCard
            title="기회 점수 높음"
            subtitle="참고 후보군"
            icon={<Target className="h-4 w-4" />}
            colorClass="text-emerald-600 dark:text-emerald-400"
            bgClass="bg-emerald-500/10"
            items={aiInsights?.high_probability ?? []}
            isLoading={aiLoading}
            getScore={(item) => `${item.win_probability ?? 0}점`}
          />
          <AIInsightCard
            title="경쟁 적은 공고"
            subtitle="평균 경쟁업체 기준"
            icon={<Users className="h-4 w-4" />}
            colorClass="text-blue-600 dark:text-blue-400"
            bgClass="bg-blue-500/10"
            items={aiInsights?.low_competition ?? []}
            isLoading={aiLoading}
            getScore={(item) => item.avg_bidders != null ? `평균 ${item.avg_bidders}개` : "경쟁↓"}
          />
          <AIInsightCard
            title="예산 큰 공고"
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
