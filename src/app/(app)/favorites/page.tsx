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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500" />
          즐겨찾기
        </h1>
        <p className="text-muted-foreground mt-1">
          관심 공고를 모아볼 수 있습니다
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {favorites && favorites.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="mx-auto h-8 w-8 mb-3 opacity-50" />
            <p>즐겨찾기한 공고가 없습니다</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                공고 검색하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {favorites && favorites.length > 0 && (
        <div className="space-y-3">
          {favorites.map((fav) => {
            const tender = fav.tender;
            if (!tender) return null;
            const agency = tender.agency as unknown as { name: string } | null;

            return (
              <Card key={fav.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/tenders/${tender.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
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
                      <h3 className="font-semibold truncate">{tender.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
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
                      <p className="font-semibold">
                        {formatKRW(tender.budget_amount)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(tender.id)}
                        disabled={removeFavorite.isPending}
                      >
                        <StarOff className="h-4 w-4 text-yellow-500" />
                      </Button>
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
