"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, HelpCircle, Info } from "lucide-react";

export type DataQuality = "real" | "partial" | "insufficient";

interface DataQualityBadgeProps {
  quality: DataQuality;
  /** 추가 설명 (툴팁에 표시) */
  detail?: string;
  /** 컴팩트 모드: 아이콘만 표시 */
  compact?: boolean;
}

const CONFIG: Record<
  DataQuality,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    className: string;
  }
> = {
  real: {
    label: "실데이터 기반",
    description: "나라장터 실제 낙찰 데이터를 충분히 확보하여 계산한 수치입니다.",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  partial: {
    label: "부분 추정",
    description:
      "일부 항목은 실데이터, 나머지는 제한된 데이터로 추정한 수치입니다. 참고 용도로만 사용하세요.",
    icon: <AlertCircle className="h-3 w-3" />,
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  insufficient: {
    label: "데이터 부족",
    description:
      "현재 낙찰 데이터가 충분하지 않습니다. 데이터 수집이 진행 중이며, 이 수치는 신뢰하지 마세요.",
    icon: <HelpCircle className="h-3 w-3" />,
    className:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
  },
};

/**
 * AI 점수 / 분석 수치 옆에 표시하는 데이터 신뢰성 배지
 */
export function DataQualityBadge({
  quality,
  detail,
  compact = false,
}: DataQualityBadgeProps) {
  const cfg = CONFIG[quality];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 cursor-help ${cfg.className}`}
          >
            {cfg.icon}
            {!compact && cfg.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{cfg.label}</p>
            <p className="text-xs text-muted-foreground">{cfg.description}</p>
            {detail && (
              <p className="text-xs text-muted-foreground border-t pt-1">{detail}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 데이터 없음 상태 플레이스홀더
 * 실제 데이터가 없을 때 숫자/점수 대신 표시
 */
interface DataUnavailableProps {
  reason?: "collecting" | "no_data" | "api_error";
  className?: string;
}

const REASON_TEXT: Record<NonNullable<DataUnavailableProps["reason"]>, string> = {
  collecting: "수집 중",
  no_data: "데이터 없음",
  api_error: "수집 오류",
};

export function DataUnavailable({
  reason = "collecting",
  className = "",
}: DataUnavailableProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm text-muted-foreground ${className}`}
    >
      <Info className="h-3.5 w-3.5 shrink-0" />
      {REASON_TEXT[reason]}
    </span>
  );
}

/**
 * 분석 준비 중 상태 메시지
 * 점수 카드가 완전히 없을 때 사용
 */
export function AnalysisNotReady({
  message = "낙찰 데이터 수집 중",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <HelpCircle className="h-6 w-6 text-slate-400" />
      </div>
      <div>
        <p className="font-medium text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          분석에 충분한 낙찰 데이터가 쌓이면 자동으로 표시됩니다
        </p>
      </div>
    </div>
  );
}
