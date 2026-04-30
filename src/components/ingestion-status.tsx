"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Database,
  Wifi,
} from "lucide-react";
import { useIngestionStatus } from "@/hooks/use-api";

function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());

    updateCurrentTime();
    const intervalId = window.setInterval(updateCurrentTime, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  return currentTime;
}

function formatJobLabel(jobType: string): string {
  switch (jobType) {
    case "tenders":
      return "공고 수집";
    case "awards":
      return "낙찰 수집";
    case "alerts":
      return "알림 처리";
    case "participants":
      return "참여업체 수집";
    case "cleanup":
      return "정리 작업";
    case "analysis_rebuild":
      return "분석 재구성";
    default:
      return jobType;
  }
}

function formatRelativeTime(iso: string | null, currentTime: number | null): string {
  if (!iso) return "없음";
  if (!currentTime) return "방금";

  const diff = currentTime - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

/**
 * 운영 상태 인디케이터 (헤더 또는 페이지 상단 배너용)
 */
export function IngestionStatusBanner() {
  const { data: status, isLoading } = useIngestionStatus();
  const currentTime = useCurrentTime();

  if (isLoading) return null;
  if (!status) return null;

  // 정상 상태면 배너 숨김
  if (status.system_ok) return null;

  const tenderDelayed =
    currentTime !== null &&
    status.tenders.last_success_at &&
    currentTime - new Date(status.tenders.last_success_at).getTime() > 1000 * 60 * 60 * 6;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        {status.recent_failures.length > 0
          ? `${formatJobLabel(status.recent_failures[0]?.job_type ?? "cron")} 오류 감지 — 일부 수치가 최신이 아닐 수 있습니다`
          : tenderDelayed
          ? "외부 API 수집 지연 — 최신 공고가 반영되지 않을 수 있습니다"
          : "데이터 수집 상태 확인 필요"}
      </span>
    </div>
  );
}

/**
 * 운영 상태 카드 (설정/대시보드 하단 표시용)
 */
export function IngestionStatusCard() {
  const { data: status, isLoading } = useIngestionStatus();
  const currentTime = useCurrentTime();

  return (
    <Card className="premium-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-muted-foreground" />
          데이터 수집 현황
          {!isLoading && status && (
            <Badge
              variant="outline"
              className={
                status.system_ok
                  ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20"
                  : "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20"
              }
            >
              {status.system_ok ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> 정상
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" /> 주의
                </>
              )}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : !status ? (
          <p className="text-sm text-muted-foreground">상태 조회 실패</p>
        ) : (
          <div className="space-y-3 text-sm">
            <StatusRow
              icon={<Wifi className="h-4 w-4" />}
              label="공고 최근 수집"
              value={formatRelativeTime(status.tenders.last_success_at, currentTime)}
              ok={status.tenders.failure_count_24h === 0}
            />
            <StatusRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="낙찰 최근 수집"
              value={formatRelativeTime(status.awards.last_success_at, currentTime)}
              ok={status.awards.failure_count_24h === 0}
            />
            <StatusRow
              icon={<RefreshCw className="h-4 w-4" />}
              label="분석 캐시 갱신"
              value={formatRelativeTime(status.analysis.last_success_at ?? status.analysis_last_rebuilt, currentTime)}
              ok={
                currentTime === null || !status.analysis.last_success_at
                  ? false
                  : currentTime - new Date(status.analysis.last_success_at).getTime() <
                    1000 * 60 * 60 * 30
              }
            />
            <StatusRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="알림 최근 처리"
              value={formatRelativeTime(status.alerts.last_success_at, currentTime)}
              ok={status.alerts.failure_count_24h === 0}
            />
            <StatusRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="참여업체 최근 수집"
              value={formatRelativeTime(status.participants.last_success_at, currentTime)}
              ok={status.participants.failure_count_24h === 0}
            />
            <StatusRow
              icon={<Clock className="h-4 w-4" />}
              label="현재 실행 중"
              value={status.running_jobs.length > 0 ? `${status.running_jobs.length}개` : "없음"}
              ok={status.running_jobs.length === 0}
            />
            <StatusRow
              icon={<XCircle className="h-4 w-4" />}
              label="24h 수집 실패"
              value={status.recent_failures.length > 0 ? `${status.recent_failures.length}건` : "없음"}
              ok={status.recent_failures.length === 0}
            />
            {status.recent_failures.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                {status.recent_failures.slice(0, 2).map((failure, index) => (
                  <div key={`${failure.job_type}-${failure.at}-${index}`} className="flex items-start justify-between gap-3">
                    <span className="font-medium">{formatJobLabel(failure.job_type)}</span>
                    <span className="text-right text-amber-800/80 dark:text-amber-200/80">
                      {failure.message ?? "오류 메시지 없음"}
                      {failure.at ? ` · ${formatRelativeTime(failure.at, currentTime)}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        )}
        <span className={ok ? "font-medium" : "text-amber-600 dark:text-amber-400"}>
          {value}
        </span>
      </div>
    </div>
  );
}

/**
 * 최근 수집 시각 인라인 표시 (hero 배너 등에서 사용)
 */
export function LastUpdatedInline() {
  const { data: status } = useIngestionStatus();

  const lastAt = status?.tenders.last_success_at;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      {lastAt
        ? `최근 수집: ${formatRelativeTime(lastAt)}`
        : "수집 정보 없음"}
    </span>
  );
}
