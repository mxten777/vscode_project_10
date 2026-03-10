"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useTender, useToggleFavorite } from "@/hooks/use-api";
import { formatKRW, tenderStatusLabel, formatRawDate } from "@/lib/helpers";
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
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

function getDdayInfo(deadline: string | null): { label: string; urgent: boolean; days: number } | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  return { label: diff === 0 ? "D-DAY" : `D-${diff}`, urgent: diff <= 3, days: diff };
}
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
      <Card className="premium-card">
        <CardContent className="py-20 text-center text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mx-auto mb-5">
            <ExternalLink className="h-7 w-7 text-primary/50" />
          </div>
          <p className="text-lg font-semibold text-foreground">공고를 찾을 수 없습니다</p>
          <p className="text-sm mt-1.5">삭제되었거나 잘못된 주소입니다</p>
          <Button variant="outline" className="mt-6 rounded-xl h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all" onClick={() => router.push("/")}>
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
  const dday = getDdayInfo(tender.deadline_at ?? null);

  // Timeline stages
  const stages = [
    {
      key: "published",
      label: "공고 등록",
      date: tender.published_at,
      done: !!tender.published_at,
      active: tender.status === "OPEN" && !award,
    },
    {
      key: "bidding",
      label: "입찰 진행",
      date: null,
      done: tender.status !== "OPEN",
      active: tender.status === "OPEN",
    },
    {
      key: "deadline",
      label: "마감",
      date: tender.deadline_at,
      done: tender.status === "CLOSED" || tender.status === "RESULT",
      active: tender.status === "CLOSED",
    },
    {
      key: "result",
      label: "결과 발표",
      date: award?.opened_at ?? null,
      done: !!award,
      active: tender.status === "RESULT",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1 rounded-xl hover:bg-primary/5 hover:text-primary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
        <Button
          variant={tender.is_favorited ? "default" : "outline"}
          size="sm"
          className="gap-1.5 rounded-xl px-4 shadow-sm transition-all hover:shadow-md"
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

      {/* Title + D-day banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 px-8 py-7 sm:px-10">
        <div className="noise-overlay" />
        <div className="absolute top-[-15%] right-[-5%] h-[200px] w-[200px] rounded-full bg-indigo-500/25 blur-[80px] animate-mesh pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge
                  variant={
                    tender.status === "OPEN" ? "default" : tender.status === "CLOSED" ? "secondary" : "outline"
                  }
                  className="text-xs font-semibold"
                >
                  {tenderStatusLabel(tender.status)}
                </Badge>
                {tender.method_type && (
                  <Badge variant="outline" className="text-xs border-white/20 text-white/70">{tender.method_type}</Badge>
                )}
                {dday && (
                  <span className={`${dday.urgent ? "dday-urgent" : "dday-warning"}`}>{dday.label}</span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-white">{tender.title}</h1>
              <p className="text-xs text-white/40 mt-2 font-mono">
                공고번호: {tender.source_tender_id}
              </p>
            </div>
            {/* D-day countdown card */}
            {dday && (
              <div className={`shrink-0 flex flex-col items-center justify-center rounded-2xl px-5 py-3 min-w-[80px] ${dday.urgent ? "bg-rose-500/20 border border-rose-500/30" : "bg-amber-500/15 border border-amber-500/25"}`}>
                <Clock className={`h-4 w-4 mb-1 ${dday.urgent ? "text-rose-300" : "text-amber-300"}`} />
                <span className={`text-2xl font-extrabold tracking-tight ${dday.urgent ? "text-rose-300" : "text-amber-300"}`}>{dday.label}</span>
                <span className="text-[10px] text-white/50 mt-0.5">마감까지</span>
              </div>
            )}
          </div>
          {/* Budget highlight */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2">
              <Banknote className="h-4 w-4 text-emerald-300" />
              <span className="text-sm text-white/60 font-medium">추정가격</span>
              <span className="text-lg font-extrabold text-emerald-300 tabular-nums">{formatKRW(tender.budget_amount)}</span>
            </div>
            {agency?.name && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-4 py-2">
                <Building className="h-4 w-4 text-white/50" />
                <span className="text-sm text-white/70 font-medium">{agency.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Card className="premium-card overflow-hidden">
        <CardContent className="py-5 px-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">진행 단계</p>
          <div className="flex items-start gap-0">
            {stages.map((stage, i) => (
              <div key={stage.key} className="flex-1 flex flex-col items-center relative">
                {/* connector line */}
                {i < stages.length - 1 && (
                  <div className={`absolute top-3.5 left-1/2 w-full h-0.5 ${stage.done ? "bg-primary/50" : "bg-border/60"}`} />
                )}
                <div className={`timeline-dot ${stage.done ? "done" : stage.active ? "active" : "pending"} relative z-10`}>
                  {stage.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : stage.active ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </div>
                <p className={`text-[11px] font-semibold mt-2 text-center ${stage.done ? "text-primary" : stage.active ? "text-foreground" : "text-muted-foreground"}`}>
                  {stage.label}
                </p>
                {stage.date && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 text-center">
                    {new Date(stage.date).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        <Card className="premium-card card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
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
              value={formatRawDate(tender.raw_json, "bidNtceDt", tender.published_at, true)}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="마감일"
              value={formatRawDate(tender.raw_json, "bidClseDt", tender.deadline_at, true)}
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

        <Card className="premium-card card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 mb-3">
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
        <Card className="premium-card">
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
