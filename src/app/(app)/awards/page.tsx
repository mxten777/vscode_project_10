"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAwards, type AwardsParams } from "@/hooks/use-api";
import { formatKRW } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Building,
  Calendar,
  Users,
} from "lucide-react";

const PAGE_SIZE = 20;

function AwardRowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function AwardsPage() {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState<AwardsParams>({
    sortBy: "opened_at",
    sortOrder: "desc",
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const { data, isLoading, isError } = useAwards(query);

  const handleSearch = useCallback(() => {
    setQuery((prev) => ({ ...prev, q: inputValue.trim() || undefined, page: 1 }));
  }, [inputValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  const handleSortChange = useCallback((value: string) => {
    const [sortBy, sortOrder] = value.split(":") as [AwardsParams["sortBy"], AwardsParams["sortOrder"]];
    setQuery((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
  }, []);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = query.page ?? 1;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* 헤더 */}
      <Card className="premium-card overflow-hidden border-primary/15 bg-primary/4">
        <CardContent className="px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">낙찰 이력</h1>
            {data && (
              <span className="inline-flex items-center justify-center h-7 min-w-7 rounded-full bg-primary/10 border border-primary/20 px-2 text-xs font-bold text-primary">
                {data.total.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            낙찰업체명으로 검색하거나 낙찰금액·낙찰률 순으로 정렬해 경쟁사 현황을 파악할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {/* 검색 + 정렬 */}
      <Card>
        <CardContent className="px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="낙찰업체명으로 검색"
                className="pl-9"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} className="shrink-0">검색</Button>
            <Select
              value={`${query.sortBy}:${query.sortOrder}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opened_at:desc">개찰일 최신순</SelectItem>
                <SelectItem value="opened_at:asc">개찰일 오래된순</SelectItem>
                <SelectItem value="awarded_amount:desc">낙찰금액 높은순</SelectItem>
                <SelectItem value="awarded_amount:asc">낙찰금액 낮은순</SelectItem>
                <SelectItem value="awarded_rate:desc">낙찰률 높은순</SelectItem>
                <SelectItem value="awarded_rate:asc">낙찰률 낮은순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 검색어 배지 */}
      {query.q && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>검색:</span>
          <Badge variant="secondary" className="gap-1">
            {query.q}
            <button
              className="ml-1 hover:text-foreground"
              onClick={() => {
                setInputValue("");
                setQuery((prev) => ({ ...prev, q: undefined, page: 1 }));
              }}
            >
              ×
            </button>
          </Badge>
        </div>
      )}

      {/* 결과 테이블 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <span>
                총{" "}
                <span className="text-primary font-bold">
                  {data?.total.toLocaleString() ?? 0}
                </span>
                건
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <p className="px-6 py-8 text-center text-sm text-destructive">
              낙찰 이력을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-50">공고명</TableHead>
                    <TableHead>낙찰업체</TableHead>
                    <TableHead className="text-right">예산</TableHead>
                    <TableHead className="text-right">낙찰금액</TableHead>
                    <TableHead className="text-right">낙찰률</TableHead>
                    <TableHead>참가수</TableHead>
                    <TableHead>개찰일</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => <AwardRowSkeleton key={i} />)
                    : data?.data.map((award) => (
                        <TableRow key={award.id} className="hover:bg-muted/40">
                          <TableCell className="max-w-65">
                            <p className="truncate text-sm font-medium leading-snug">
                              {award.tender?.title ?? "-"}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Building className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {award.tender?.demand_agency_name ?? "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold">
                              {award.winner_company_name ?? "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatKRW(award.tender?.budget_amount)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatKRW(award.awarded_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {award.awarded_rate != null ? (
                              <Badge
                                variant={
                                  award.awarded_rate >= 95
                                    ? "destructive"
                                    : award.awarded_rate >= 85
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {award.awarded_rate.toFixed(2)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {award.participant_count != null ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {award.participant_count}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {award.opened_at ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {new Date(award.opened_at).toLocaleDateString("ko-KR")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {award.tender?.id && (
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/tenders/${award.tender.id}`}>
                                  <ArrowUpRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                  {!isLoading && data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        <Trophy className="mx-auto mb-3 h-8 w-8 opacity-30" />
                        {query.q
                          ? `"${query.q}"에 해당하는 낙찰 이력이 없습니다.`
                          : "낙찰 이력이 없습니다."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–
            {Math.min(currentPage * PAGE_SIZE, data?.total ?? 0).toLocaleString()} /{" "}
            {data?.total.toLocaleString()}건
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setQuery((prev) => ({ ...prev, page: currentPage - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 font-medium text-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setQuery((prev) => ({ ...prev, page: currentPage + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
