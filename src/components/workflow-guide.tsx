"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_STEPS = ["공고 선별", "상세 검토", "저장·알림", "분석 정리"];

type WorkflowAction = {
  label: string;
  href: string;
  variant?: "default" | "outline" | "ghost";
};

type WorkflowGuideProps = {
  currentStep: number;
  title: string;
  description: string;
  helper?: string;
  actions?: WorkflowAction[];
  steps?: string[];
};

type WorkflowNextStepDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  primaryAction: WorkflowAction;
  secondaryAction?: WorkflowAction;
};

export function WorkflowGuide({
  currentStep,
  title,
  description,
  helper,
  actions = [],
  steps = DEFAULT_STEPS,
}: WorkflowGuideProps) {
  return (
    <Card className="premium-card overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] text-white shadow-premium-lg">
      <CardContent className="px-5 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Sparkles className="h-3.5 w-3.5 text-sky-300" />
              Workflow Guide
            </div>
            <h2 className="mt-4 max-w-3xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/72 sm:text-base">{description}</p>
            {helper && (
              <div className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-2xl border border-sky-300/15 bg-sky-300/8 px-4 py-3 text-xs font-medium leading-relaxed text-sky-100/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:text-sm">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
                <span>{helper}</span>
              </div>
            )}
          </div>

          {actions.length > 0 && (
            <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:min-w-[20rem]">
              {actions.map((action) => (
                <Button
                  key={`${action.href}-${action.label}`}
                  asChild
                  variant={action.variant ?? "default"}
                  className={action.variant === "outline"
                    ? "h-11 rounded-xl border-white/20 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                    : action.variant === "ghost"
                    ? "h-11 rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
                    : "h-11 rounded-xl bg-white text-slate-950 hover:bg-sky-50"
                  }
                >
                  <Link href={action.href} className="flex w-full items-center justify-center">
                    {action.label}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => {
            const isDone = index < currentStep;
            const isCurrent = index === currentStep;
            const statusLabel = isCurrent ? "현재 단계" : isDone ? "완료" : "다음 단계";

            return (
              <div
                key={step}
                className={[
                  "relative overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-300",
                  isCurrent
                    ? "border-sky-300/45 bg-white/14 shadow-lg shadow-sky-950/25"
                    : isDone
                    ? "border-emerald-300/30 bg-emerald-400/10"
                    : "border-white/10 bg-white/6 hover:border-white/20 hover:bg-white/8",
                ].join(" ")}
              >
                <div
                  className={[
                    "absolute inset-x-0 top-0 h-px",
                    isCurrent
                      ? "bg-linear-to-r from-transparent via-sky-300/80 to-transparent"
                      : isDone
                      ? "bg-linear-to-r from-transparent via-emerald-300/80 to-transparent"
                      : "bg-linear-to-r from-transparent via-white/20 to-transparent",
                  ].join(" ")}
                />
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      isCurrent
                        ? "bg-sky-300 text-slate-950"
                        : isDone
                        ? "bg-emerald-300 text-emerald-950"
                        : "bg-white/10 text-white/80",
                    ].join(" ")}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{step}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={[
                      "h-full rounded-full transition-all duration-500",
                      isCurrent
                        ? "w-2/3 bg-linear-to-r from-sky-300 to-cyan-200"
                        : isDone
                        ? "w-full bg-linear-to-r from-emerald-300 to-emerald-200"
                        : "w-1/4 bg-white/20",
                    ].join(" ")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkflowNextStepDialog({
  open,
  onOpenChange,
  title,
  description,
  primaryAction,
  secondaryAction,
}: WorkflowNextStepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] sm:max-w-lg">
        <DialogHeader>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/7 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Next Step
          </div>
          <DialogTitle className="pt-3 text-2xl font-extrabold tracking-tight text-slate-950">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border/60 bg-white/85 p-4 text-sm leading-relaxed text-slate-600 shadow-sm">
          지금 액션을 끝낸 뒤에는 다음 단계로 바로 넘어가야 흐름이 끊기지 않습니다.
        </div>

        <DialogFooter className="grid gap-2 sm:grid-cols-2 sm:justify-start">
          <Button asChild className="h-11 rounded-xl btn-premium text-white sm:w-full">
            <Link href={primaryAction.href} className="flex w-full items-center justify-center">
              {primaryAction.label}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          {secondaryAction && (
            <Button asChild variant="outline" className="h-11 rounded-xl sm:w-full">
              <Link href={secondaryAction.href} className="flex w-full items-center justify-center">{secondaryAction.label}</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}