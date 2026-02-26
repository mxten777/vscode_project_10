"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useTender, useToggleFavorite } from "@/hooks/use-api";
import { formatKRW, tenderStatusLabel } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Star,
  StarOff,
  Building,
  MapPin,
  Calendar,
  Banknote,
  Trophy,
  ExternalLink,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";

export default function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: tender, isLoading, error } = useTender(id);
  const { addFavorite, removeFavorite } = useToggleFavorite();

  const handleToggleFavorite = async () => {
    if (!tender) return;
    try {
      if (tender.is_favorited) {
        await removeFavorite.mutateAsync(tender.id);
        toast.success("즐겨찾기 해제");
      } else {
        await addFavorite.mutateAsync(tender.id);
        toast.success("즐겨찾기 추가");
      }
    } catch {
      toast.error("로그인이 필요합니다");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <Skeleton className="h-10 w-3/4" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
            <ExternalLink className="h-7 w-7 opacity-50" />
          </div>
          <p className="text-lg font-medium">공고를 찾을 수 없습니다</p>
          <p className="text-sm mt-1">삭제되었거나 잘못된 주소입니다</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> 목록으로
          </Button>
        </CardContent>
      </Card>
    );
  }

  const agency = tender.agency as unknown as { name: string; code: string } | null;
  const award = tender.award as unknown as {
    winner_company_name: string | null;
    awarded_amount: number | null;
    awarded_rate: number | null;
    opened_at: string | null;
  } | null;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1 rounded-full" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
        <Button
          variant={tender.is_favorited ? "default" : "outline"}
          size="sm"
          className="gap-1.5 rounded-full px-4 shadow-sm"
          onClick={handleToggleFavorite}
          disabled={addFavorite.isPending || removeFavorite.isPending}
        >
          {tender.is_favorited ? (
            <>
              <StarOff className="h-4 w-4" />
              즐겨찾기 해제
            </>
          ) : (
            <>
              <Star className="h-4 w-4" />
              즐겨찾기 추가
            </>
          )}
        </Button>
      </div>

      {/* Title Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant={
              tender.status === "OPEN"
                ? "default"
                : tender.status === "CLOSED"
                ? "secondary"
                : "outline"
            }
            className="text-xs"
          >
            {tenderStatusLabel(tender.status)}
          </Badge>
          {tender.method_type && (
            <Badge variant="outline" className="text-xs">{tender.method_type}</Badge>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">{tender.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          공고번호: <span className="font-mono">{tender.source_tender_id}</span>
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        <Card className="border-border/60 card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Building className="h-4 w-4 text-primary" />
              </div>
              공고 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={<Building className="h-4 w-4" />}
              label="발주기관"
              value={agency?.name || tender.demand_agency_name || "-"}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="지역"
              value={tender.region_name || "-"}
            />
            <InfoRow
              icon={<Banknote className="h-4 w-4" />}
              label="추정가격"
              value={formatKRW(tender.budget_amount)}
              highlight
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="공고일"
              value={
                tender.published_at
                  ? new Date(tender.published_at).toLocaleString("ko-KR")
                  : "-"
              }
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="마감일"
              value={
                tender.deadline_at
                  ? new Date(tender.deadline_at).toLocaleString("ko-KR")
                  : "-"
              }
            />
            {tender.industry_name && (
              <InfoRow
                icon={<Building className="h-4 w-4" />}
                label="업종"
                value={tender.industry_name}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              낙찰 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            {award ? (
              <div className="space-y-4">
                <InfoRow
                  icon={<Building className="h-4 w-4" />}
                  label="낙찰업체"
                  value={award.winner_company_name || "-"}
                />
                <InfoRow
                  icon={<Banknote className="h-4 w-4" />}
                  label="낙찰금액"
                  value={formatKRW(award.awarded_amount)}
                  highlight
                />
                {award.awarded_rate != null && (
                  <InfoRow
                    icon={<Trophy className="h-4 w-4" />}
                    label="낙찰률"
                    value={`${award.awarded_rate.toFixed(2)}%`}
                  />
                )}
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="개찰일"
                  value={
                    award.opened_at
                      ? new Date(award.opened_at).toLocaleString("ko-KR")
                      : "-"
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Trophy className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm">아직 낙찰 결과가 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raw JSON */}
      {tender.raw_json && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              원문 데이터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                JSON 데이터 펼쳐보기
              </summary>
              <Separator className="my-3" />
              <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-96 border border-border/60">
                {JSON.stringify(tender.raw_json, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${highlight ? "text-primary font-semibold" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
