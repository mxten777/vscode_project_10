"use client";

import Link from "next/link";
import { useFavorites, useToggleFavorite } from "@/hooks/use-api";
import { formatKRW, tenderStatusLabel } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StarOff,
  Building,
  Calendar,
  Search,
  ArrowUpRight,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

export default function FavoritesPage() {
  const { data: favorites, isLoading } = useFavorites();
  const { removeFavorite } = useToggleFavorite();

  const handleRemove = async (tenderId: string) => {
    try {
      await removeFavorite.mutateAsync(tenderId);
      toast.success("즐겨찾기 해제");
    } catch {
      toast.error("저장 목록을 업데이트하지 못했습니다");
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <Card className="premium-card overflow-hidden border-primary/15 bg-primary/4">
        <CardContent className="px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight">다시 볼 공고</h1>
                {favorites && favorites.length > 0 && (
                  <span className="inline-flex items-center justify-center h-7 min-w-7 rounded-full bg-primary/10 border border-primary/20 px-2 text-xs font-bold text-primary">
                    {favorites.length}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                상세 검토를 이어가거나 마감 전에 다시 확인할 공고를 모아두는 화면입니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
              <div className="rounded-2xl border border-border/50 bg-background/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">추천 사용 방식</p>
                <p className="mt-1 text-sm font-semibold">검토 예정 공고를 먼저 모아두기</p>
                <p className="mt-1 text-xs text-muted-foreground">오늘 바로 판단하지 못한 공고를 다음 작업으로 넘길 때 유용합니다.</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">다음 행동</p>
                <p className="mt-1 text-sm font-semibold">상세 화면에서 판단 이어가기</p>
                <p className="mt-1 text-xs text-muted-foreground">저장 자체보다 다시 열어 검토를 완료하는 것이 목적입니다.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">저장된 공고를 우선순위대로 다시 확인하세요</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {favorites && favorites.length === 0 && (
        <Card className="premium-card">
          <CardContent className="py-20 text-center text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500/10 to-amber-500/5 mx-auto mb-5">
              <Heart className="h-7 w-7 text-amber-500/60" />
            </div>
            <p className="text-lg font-semibold text-foreground">아직 다시 볼 공고가 없습니다</p>
            <p className="text-sm mt-1.5">상세 화면에서 검토가 필요한 공고를 저장해 두세요</p>
            <Link href="/">
              <Button variant="outline" className="mt-6 rounded-xl gap-1.5 px-6 h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all">
                <Search className="h-4 w-4" />
                공고 검색하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {favorites && favorites.length > 0 && (
        <div className="space-y-3 stagger-children">
          {favorites.map((fav) => {
            const tender = fav.tender;
            if (!tender) return null;
            const agency = tender.agency as unknown as { name: string } | null;

            return (
              <Card key={fav.id} className="group premium-card card-hover">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/tenders/${tender.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant={
                            tender.status === "OPEN"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {tenderStatusLabel(tender.status)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {tender.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                        {agency?.name && (
                          <span className="flex items-center gap-1">
                            <Building className="h-3.5 w-3.5" />
                            {agency.name}
                          </span>
                        )}
                        {tender.deadline_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            마감: {new Date(tender.deadline_at).toLocaleDateString("ko-KR")}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {tender.status === "OPEN"
                          ? "상세 화면으로 들어가 마감 일정과 판단 근거를 다시 확인하세요."
                          : tender.status === "RESULT"
                          ? "결과와 낙찰 데이터를 다시 검토하기 좋은 공고입니다."
                          : "상태 변화 여부를 확인한 뒤 계속 추적할지 결정하세요."}
                      </p>
                    </Link>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-bold tracking-tight">
                        {formatKRW(tender.budget_amount)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => handleRemove(tender.id)}
                          disabled={removeFavorite.isPending}
                        >
                          <StarOff className="h-4 w-4 text-yellow-500" />
                        </Button>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
