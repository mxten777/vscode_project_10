"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Building, CreditCard, LayoutGrid, ShieldCheck, ShieldEllipsis, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const baseItems = [
  {
    href: "/settings",
    label: "개요",
    icon: LayoutGrid,
    eyebrow: "Step 1",
    description: "설정 전체 구조와 다음 이동 경로를 확인합니다.",
  },
  {
    href: "/settings/profile",
    label: "프로필",
    icon: User,
    eyebrow: "Step 2",
    description: "계정 보안과 로그인 정보를 먼저 정리합니다.",
  },
  {
    href: "/settings/company",
    label: "회사 정보",
    icon: Building,
    eyebrow: "Step 3",
    description: "업종, 지역, 예산 기준으로 검토 조건을 맞춥니다.",
  },
  {
    href: "/settings/billing",
    label: "요금제 & 결제",
    icon: CreditCard,
    eyebrow: "Step 4",
    description: "플랜 한도와 결제 흐름을 마무리 점검합니다.",
  },
];

const operationsItem = {
  href: "/settings/operations",
  label: "운영 콘솔",
  icon: ShieldEllipsis,
  eyebrow: "Admin",
  description: "수집 상태 확인 및 배치 수동 실행 (관리자 전용).",
};

interface SettingsLayoutClientProps {
  children: React.ReactNode;
  showOperations: boolean;
}

export function SettingsLayoutClient({ children, showOperations }: SettingsLayoutClientProps) {
  const pathname = usePathname();
  const sidebarItems = showOperations ? [...baseItems, operationsItem] : baseItems;
  const activeItem =
    sidebarItems.find((item) =>
      item.href === "/settings" ? pathname === "/settings" : pathname === item.href
    ) ?? sidebarItems[0];

  return (
    <div className="mx-auto max-w-5xl page-mesh">
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.96))] px-6 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Settings Workflow
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">설정도 기능 목록이 아니라, 운영 준비 순서로 읽히게 정리했습니다</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              계정 보안, 회사 기준, 플랜 상태를 따로따로 찾지 않도록 현재 단계와 다음 단계를 한 화면 구조 안에서 이어줍니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-lg">
            {[
              { label: "현재 단계", value: activeItem.label },
              { label: "지금 할 일", value: activeItem.description },
              { label: "다음 포인트", value: "설정 완료 후 알림·팀 운영으로 연결" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-sm backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/70">{item.label}</p>
                <p className="mt-2 text-sm font-semibold tracking-tight text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-8">
        {/* Sidebar */}
        <aside className="shrink-0 sm:w-72">
          <div className="premium-card overflow-hidden rounded-[1.75rem] border-border/60 p-3 shadow-premium-lg">
            <div className="rounded-4xl border border-border/60 bg-background/80 px-4 py-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Navigation
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                현재 설정 단계가 어디인지 확인하고, 다음으로 넘어갈 항목을 바로 선택할 수 있습니다.
              </p>
            </div>

            <nav className="mt-3 flex sm:flex-col gap-2">
              {sidebarItems.map((item) => {
                const active =
                  item.href === "/settings"
                    ? pathname === "/settings"
                    : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group rounded-4xl border px-4 py-4 text-sm transition-all duration-200",
                      active
                        ? "border-primary/20 bg-primary/8 text-primary shadow-sm"
                        : "border-border/60 bg-background/55 text-muted-foreground hover:border-primary/15 hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                        active
                          ? "border-primary/20 bg-primary/12 text-primary"
                          : "border-border/60 bg-background text-foreground group-hover:border-primary/15 group-hover:text-primary"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/70">{item.eyebrow}</span>
                        {active && (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Current</span>
                        )}
                      </div>
                      <p className="mt-1 font-semibold text-foreground group-hover:text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowRight
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 transition-transform",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary"
                      )}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
