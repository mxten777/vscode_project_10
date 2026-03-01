"use client";

import Link from "next/link";
import { useFavorites, useToggleFavorite } from "@/hooks/use-api";
import { formatKRW, tenderStatusLabel } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
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
      toast.error("오류 발생");
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">즐겨찾기</h1>
            {favorites && favorites.length > 0 && (
              <span className="inline-flex items-center justify-center h-7 min-w-7 rounded-full bg-primary/10 border border-primary/20 px-2 text-xs font-bold text-primary">
                {favorites.length}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">관심 공고를 모아볼 수 있습니다</p>
        </div>
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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 mx-auto mb-5">
              <Heart className="h-7 w-7 text-amber-500/60" />
            </div>
            <p className="text-lg font-semibold text-foreground">즐겨찾기한 공고가 없습니다</p>
            <p className="text-sm mt-1.5">관심 있는 공고에서 별표를 눌러 추가하세요</p>
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
