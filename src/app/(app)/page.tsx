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
} from "lucide-react";

const PAGE_SIZE = 20;

export default function HomePage() {
  return (
    <Suspense fallback={<div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-28 w-full rounded-lg bg-muted animate-pulse" />))}</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 쿼리에서 초기값 가져옴
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") || "published_at"
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );

  // 디바운스 검색어
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // URL 동기화
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">입찰 공고 검색</h1>
        <p className="text-muted-foreground mt-1">
          나라장터 공공 입찰 공고를 검색하고 분석하세요
        </p>
      </div>

      {/* 필터 패널 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="공고명 검색..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40">
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
              <SelectTrigger className="w-full md:w-44">
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

      {/* 결과 카운트 */}
      {data && (
        <p className="text-sm text-muted-foreground">
          총 <strong>{data.total.toLocaleString()}</strong>건
          {debouncedQ && (
            <>
              {" · "}
              <span>&quot;{debouncedQ}&quot; 검색 결과</span>
            </>
          )}
        </p>
      )}

      {/* 로딩 스켈레톤 */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
          </CardContent>
        </Card>
      )}

      {/* 결과 리스트 */}
      {data && data.data.length > 0 && (
        <div className="space-y-3">
          {data.data.map((tender) => (
            <Link key={tender.id} href={`/tenders/${tender.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusColor(tender.status) as "default" | "secondary" | "outline"}>
                          {tenderStatusLabel(tender.status)}
                        </Badge>
                        {tender.method_type && (
                          <Badge variant="outline" className="text-xs">
                            {tender.method_type}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{tender.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
                      <p className="font-semibold text-lg">
                        {formatKRW(tender.budget_amount)}
                      </p>
                      {tender.published_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(tender.published_at).toLocaleDateString("ko-KR")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* 빈 결과 */}
      {data && data.data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="mx-auto h-8 w-8 mb-3 opacity-50" />
            <p>검색 결과가 없습니다</p>
          </CardContent>
        </Card>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
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
