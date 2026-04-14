"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useTender, useToggleFavorite, useBidRecommendation, useSimilarBids, useTenderParticipants } from "@/hooks/use-api";
import { formatKRW, tenderStatusLabel, formatRawDate, getDday } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Lightbulb,
  AlertTriangle,
  Zap,
  Shield,
  Target,
  Users,
  Microscope,
  Info,
} from "lucide-react";
import { DataQualityBadge } from "@/components/data-quality-badge";
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
  const { data: recommendation, isLoading: recLoading } = useBidRecommendation(id);
  const { data: similarBids, isLoading: similarLoading } = useSimilarBids(id, 5);
  // 정밀 분석: CLOSED/RESULT 공고 또는 즐겨찾기 공고에서 자동 수집
  const canLoadParticipants =
    !!tender && (tender.status !== "OPEN" || !!tender.is_favorited ||
      (tender.analysis_level !== undefined && tender.analysis_level >= 2));
  const { data: participantsResult, isLoading: participantsLoading } =
    useTenderParticipants(id, canLoadParticipants);

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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-5">
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
  const dday = getDday(tender.deadline_at ?? null);

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
      <div className="relative overflow-hidden rounded-2xl px-6 py-7 sm:px-10" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1e2d6b 50%, #2e1065 100%)" }}>
        <div className="noise-overlay" />
        <div className="absolute top-[-15%] right-[-5%] h-50 w-50 rounded-full bg-indigo-500/30 blur-[80px] animate-mesh pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[5%] h-40 w-40 rounded-full bg-violet-500/20 blur-[70px] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(129,140,248,0.7) 50%, transparent)" }} />
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
                  <Badge variant="outline" className="text-xs border-white/30 text-white/85 bg-white/10">{tender.method_type}</Badge>
                )}                {/* 분석 레벨 배지 */}
                {(tender.analysis_level ?? 1) >= 3 ? (
                  <Badge variant="outline" className="text-xs border-emerald-400/50 text-emerald-200 bg-emerald-500/15">
                    <Microscope className="h-3 w-3 mr-1" />정밀 분석
                  </Badge>
                ) : (tender.analysis_level ?? 1) >= 2 ? (
                  <Badge variant="outline" className="text-xs border-blue-400/50 text-blue-200 bg-blue-500/15">
                    <TrendingUp className="h-3 w-3 mr-1" />후보군
                  </Badge>
                ) : null}                {dday && (
                  <span className={`${dday.urgent ? "dday-urgent" : "dday-warning"}`}>{dday.label}</span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-white">{tender.title}</h1>
              <p className="text-xs text-white/60 mt-2 font-mono">
                공고번호: {tender.source_tender_id}
              </p>
            </div>
            {/* D-day countdown card */}
            {dday && (
              <div className={`shrink-0 flex flex-col items-center justify-center rounded-2xl px-5 py-3 min-w-20 ${dday.urgent ? "bg-rose-500/25 border border-rose-400/40" : "bg-amber-500/20 border border-amber-400/35"}`}>
                <Clock className={`h-4 w-4 mb-1 ${dday.urgent ? "text-rose-200" : "text-amber-200"}`} />
                <span className={`text-2xl font-extrabold tracking-tight ${dday.urgent ? "text-rose-200" : "text-amber-200"}`}>{dday.label}</span>
                <span className="text-[10px] text-white/55 mt-0.5">마감까지</span>
              </div>
            )}
          </div>
          {/* Budget highlight */}
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5" style={{ background: "rgba(255,255,255,0.13)", borderColor: "rgba(255,255,255,0.20)" }}>
              <Banknote className="h-4 w-4 text-emerald-300" />
              <span className="text-xs text-white/65 font-medium">추정가격</span>
              <span className="text-lg font-extrabold text-emerald-200 tabular-nums">{formatKRW(tender.budget_amount)}</span>
            </div>
            {agency?.name && (
              <div className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5" style={{ background: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.18)" }}>
                <Building className="h-4 w-4 text-indigo-300" />
                <span className="text-sm text-white/80 font-medium">{agency.name}</span>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12">
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
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 mb-3">
                  <Trophy className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm">아직 낙찰 결과가 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bid Intelligence Section */}
      {tender.status === "OPEN" && (
        <Card className="premium-card overflow-hidden border-primary/20">
          <CardHeader className="pb-4 bg-primary/4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              AI 투찰가 분석
            </CardTitle>
            <CardDescription className="text-xs">
              과거 유사 낙찰 사례를 기반으로 최적의 투찰가를 추천합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {recLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 rounded-xl" />
                <div className="grid gap-3 md:grid-cols-3">
                  <Skeleton className="h-40 rounded-xl" />
                  <Skeleton className="h-40 rounded-xl" />
                  <Skeleton className="h-40 rounded-xl" />
                </div>
              </div>
            ) : !recommendation ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 mb-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-foreground">아직 분석 데이터가 부족합니다</p>
                <p className="text-xs mt-1">충분한 데이터가 수집되면 추천이 제공됩니다</p>
              </div>
            ) : (
              <>
                {/* Warnings */}
                {recommendation.warnings && recommendation.warnings.length > 0 && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-900 dark:text-amber-200">
                      {recommendation.warnings.map((warning, i) => (
                        <p key={i}>{warning}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategy Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Conservative */}
                  <StrategyCard
                    title="보수적 전략"
                    icon={<Shield className="h-5 w-5" />}
                    color="emerald"
                    rate={recommendation.conservative_rate}
                    amount={recommendation.conservative_amount}
                    confidence={recommendation.conservative_confidence}
                    description="낙찰 확률 높음, 안정적 접근"
                    badge="안전"
                  />

                  {/* Standard */}
                  <StrategyCard
                    title="기준 전략"
                    icon={<Target className="h-5 w-5" />}
                    color="blue"
                    rate={recommendation.standard_rate}
                    amount={recommendation.standard_amount}
                    confidence={recommendation.standard_confidence}
                    description="균형잡힌 접근, 추천"
                    badge="추천"
                    recommended
                  />

                  {/* Aggressive */}
                  <StrategyCard
                    title="공격적 전략"
                    icon={<Zap className="h-5 w-5" />}
                    color="rose"
                    rate={recommendation.aggressive_rate}
                    amount={recommendation.aggressive_amount}
                    confidence={recommendation.aggressive_confidence}
                    description="수익성 높음, 리스크 존재"
                    badge="고수익"
                  />
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    유사 사례 {recommendation.similar_bids_count}건
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    최근 {recommendation.analysis_period_months}개월 분석
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    데이터 품질 {Math.round((recommendation.data_quality_score ?? 0) * 100)}%
                  </span>
                </div>
              </>
            )}

            {/* Similar Bids */}
            {!similarLoading && similarBids && similarBids.items && similarBids.items.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    유사 낙찰 사례
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    총 {similarBids.items.length}건
                  </Badge>
                </div>
                <div className="space-y-2">
                  {similarBids.items.slice(0, 5).map((bid: typeof similarBids.items[0], idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors p-3 border border-border/40"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{bid.notice_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {bid.demand_organization} · {bid.total_bidders}개 업체 참여
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-primary">{bid.winner_bid_rate?.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground">
                          {bid.awarded_at ? new Date(bid.awarded_at).toLocaleDateString("ko-KR") : "-"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${
                          (bid.similarity_score ?? 0) >= 0.7
                            ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : (bid.similarity_score ?? 0) >= 0.5
                            ? "border-blue-500/30 text-blue-700 dark:text-blue-400"
                            : "border-amber-500/30 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {Math.round((bid.similarity_score ?? 0) * 100)}% 유사
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 정밀 분석 섹션 — bid_participants 기반 */}
      {(canLoadParticipants || (tender.analysis_level ?? 1) >= 2) && (
        <Card className="premium-card overflow-hidden border-emerald-500/20">
          <CardHeader className="pb-4 bg-emerald-500/5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
                  <Microscope className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                정밀 분석
              </CardTitle>
              {participantsResult && (
                <DataQualityBadge quality={participantsResult.data_quality as "real" | "partial" | "insufficient"} />
              )}
            </div>
            <CardDescription className="text-xs">
              실데이터 기반 참여업체 및 경쟁 분석
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {participantsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
            ) : !participantsResult || participantsResult.data_quality === "insufficient" ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
                  <Info className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground">기본 분석 대상</p>
                <p className="text-xs mt-1 text-center max-w-xs">
                  {participantsResult?.message ?? "즐겨찾기 추가 시 정밀 분석이 시작됩니다."}
                </p>
                {!tender.is_favorited && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-1.5 rounded-xl"
                    onClick={handleToggleFavorite}
                    disabled={addFavorite.isPending}
                  >
                    <Star className="h-3.5 w-3.5" />
                    즐겨찾기 추가하여 정밀 분석 시작
                  </Button>
                )}
              </div>
            ) : participantsResult.participants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 opacity-40 mb-3" />
                <p className="text-sm">
                  {participantsResult.message ?? "낙찰 결과 데이터가 아직 없습니다."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 참여업체 수 요약 */}
                {participantsResult.participant_count != null && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">{participantsResult.participant_count}개 업체</span>
                      <span className="text-muted-foreground ml-1">참여</span>
                    </span>
                    {participantsResult.source === "live" && (
                      <Badge variant="secondary" className="text-xs ml-auto">실시간 수집</Badge>
                    )}
                  </div>
                )}
                {/* 참여업체 리스트 */}
                {participantsResult.participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        p.bid_rank === 1
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {p.bid_rank ?? "-"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.company_name}</p>
                        {p.is_winner && (
                          <Badge variant="outline" className="text-[10px] mt-0.5 border-amber-500/30 text-amber-700 dark:text-amber-400">
                            <Trophy className="h-2.5 w-2.5 mr-1" />낙찰
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {p.bid_rate != null && (
                        <p className="text-sm font-semibold text-primary">{p.bid_rate.toFixed(2)}%</p>
                      )}
                      {p.bid_amount != null && (
                        <p className="text-xs text-muted-foreground">{formatKRW(p.bid_amount)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

function StrategyCard({
  title,
  icon,
  color,
  rate,
  amount,
  confidence,
  description,
  badge,
  recommended,
}: {
  title: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "rose";
  rate: number;
  amount: number;
  confidence: string;
  description: string;
  badge: string;
  recommended?: boolean;
}) {
  const colorClasses = {
    emerald: {
      bgStyle: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))",
      border: "border-emerald-500/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: "text-emerald-600 dark:text-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    blue: {
      bgStyle: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))",
      border: "border-blue-500/30",
      text: "text-blue-700 dark:text-blue-400",
      icon: "text-blue-600 dark:text-blue-500",
      badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    },
    rose: {
      bgStyle: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))",
      border: "border-rose-500/30",
      text: "text-rose-700 dark:text-rose-400",
      icon: "text-rose-600 dark:text-rose-500",
      badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${classes.border} p-4 transition-all hover:shadow-lg ${recommended ? "ring-2 ring-primary/20" : ""}`}
      style={{ background: classes.bgStyle }}
    >
      {recommended && (
        <div className="absolute top-2 right-2">
          <Badge className="text-[10px] px-2 py-0.5">
            <Star className="h-3 w-3 mr-0.5 fill-current" />
            추천
          </Badge>
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${classes.icon}`}>
          {icon}
        </div>
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">투찰률</p>
          <p className={`text-2xl font-extrabold tabular-nums ${classes.text}`}>
            {rate?.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">투찰가</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatKRW(amount)}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className={`text-[10px] ${classes.badge}`}>
            {badge}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              confidence === "HIGH"
                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : confidence === "MEDIUM"
                ? "border-blue-500/30 text-blue-700 dark:text-blue-400"
                : "border-amber-500/30 text-amber-700 dark:text-amber-400"
            }`}
          >
            {confidence === "HIGH" ? "높은 신뢰도" : confidence === "MEDIUM" ? "보통 신뢰도" : "낮은 신뢰도"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground pt-1">{description}</p>
      </div>
    </div>
  );
}
