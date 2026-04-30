import Link from "next/link";
import { ArrowRight, Bell, Building2, CreditCard, ShieldCheck, ShieldEllipsis, UserCircle2, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth-context";
import { canAccessOperationsConsole } from "@/lib/operations-access";

const baseSetupCards = [
  {
    href: "/settings/profile",
    title: "계정 보안",
    description: "로그인 이메일을 확인하고 비밀번호를 바로 변경합니다.",
    icon: UserCircle2,
  },
  {
    href: "/settings/company",
    title: "회사 정보",
    description: "업종, 지역, 예산 기준을 정리해 추천과 필터 기준을 맞춥니다.",
    icon: Building2,
  },
  {
    href: "/settings/billing",
    title: "플랜과 결제",
    description: "현재 플랜을 확인하고 업그레이드나 결제 관리를 진행합니다.",
    icon: CreditCard,
  },
];

const workflowLinks = [
  {
    href: "/alerts",
    label: "알림 추적",
    description: "새 공고를 놓치지 않도록 규칙과 발송 이력을 관리합니다.",
    icon: Bell,
  },
  {
    href: "/team",
    label: "팀 관리",
    description: "조직 멤버와 초대 상태를 정리합니다.",
    icon: Users,
  },
];

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  const canManageOperations = !("error" in ctx) && canAccessOperationsConsole(ctx);
  const setupCards = canManageOperations
    ? [
        ...baseSetupCards,
        {
          href: "/settings/operations",
          title: "운영 콘솔",
          description: "수집 상태를 보고 배치를 수동 실행하는 관리자 전용 화면입니다.",
          icon: ShieldEllipsis,
        },
      ]
    : baseSetupCards;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-amber-50 via-background to-sky-50 px-6 py-6 shadow-sm">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-medium text-amber-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            설정 허브
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">계정, 회사 기준, 플랜 관리를 한 곳에서 정리합니다</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              공고를 찾고 저장하고 알림으로 이어지는 핵심 흐름이 흔들리지 않도록,
              이 화면에서 기본 설정과 운영 항목으로 바로 이동할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {setupCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.href} className="border-border/60 bg-card/95 shadow-sm">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{item.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href={item.href}>
                    바로 열기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">권장 진행 순서</CardTitle>
            <CardDescription>처음 세팅하거나 운영 점검할 때는 이 순서가 가장 짧습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="font-medium text-foreground">1. 계정 보안 확인</p>
              <p className="mt-1 text-muted-foreground">로그인 이메일과 비밀번호를 먼저 정리해 접근 문제를 줄입니다.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="font-medium text-foreground">2. 회사 기준 입력</p>
              <p className="mt-1 text-muted-foreground">업종, 지역, 예산 범위를 넣어 추천과 검토 기준을 맞춥니다.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="font-medium text-foreground">3. 플랜과 알림 범위 점검</p>
              <p className="mt-1 text-muted-foreground">즐겨찾기와 알림 규칙 한도를 확인하고 필요 시 업그레이드합니다.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">운영 바로가기</CardTitle>
            <CardDescription>설정 이후 자주 이어지는 화면입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflowLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
