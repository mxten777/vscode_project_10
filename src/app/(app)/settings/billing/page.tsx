"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ExternalLink, Zap, Building2, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type SubInfo = {
  plan: "free" | "pro" | "enterprise";
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_stripe: boolean;
};

const PLAN_META = {
  free:       { label: "Free",       icon: Shield,    color: "text-slate-500",  bg: "bg-slate-100 dark:bg-slate-800" },
  pro:        { label: "Pro",        icon: Zap,       color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950" },
  enterprise: { label: "Enterprise", icon: Building2, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950" },
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default function BillingSettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const justPaid = searchParams.get("success") === "true";

  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then(setSub)
      .catch(() => toast.error("구독 정보를 불러오지 못했습니다"))
      .finally(() => setLoadingSub(false));
  }, []);

  const handleUpgrade = async (plan: "pro" | "enterprise") => {
    setUpgradeLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "결제 세션 생성 실패");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("결제 페이지로 이동 중 오류가 발생했습니다");
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "포털 이동 실패");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("구독 관리 페이지로 이동 중 오류가 발생했습니다");
    } finally {
      setPortalLoading(false);
    }
  };

  const planMeta = sub ? PLAN_META[sub.plan] : null;
  const PlanIcon = planMeta?.icon ?? Shield;

  return (
    <div className="space-y-6">
      {/* 결제 성공 배너 */}
      {justPaid && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">구독이 완료되었습니다!</p>
            <p className="text-emerald-600 dark:text-emerald-400">플랜이 성공적으로 활성화되었습니다.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
            onClick={() => router.replace("/settings/billing")}
          >
            닫기
          </Button>
        </div>
      )}

      {/* 현재 플랜 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">현재 플랜</CardTitle>
          <CardDescription>현재 구독 중인 요금제 정보입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSub ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중...
            </div>
          ) : sub ? (
            <div className="space-y-4">
              {/* Plan badge */}
              <div className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 ${planMeta?.bg}`}>
                <PlanIcon className={`h-5 w-5 ${planMeta?.color}`} />
                <span className={`font-semibold ${planMeta?.color}`}>{planMeta?.label} 플랜</span>
                {sub.status === "active" && (
                  <Badge variant="outline" className="border-emerald-300 text-emerald-600 text-[10px]">활성</Badge>
                )}
                {sub.status === "past_due" && (
                  <Badge variant="destructive" className="text-[10px]">결제 실패</Badge>
                )}
                {sub.status === "canceled" && (
                  <Badge variant="outline" className="text-[10px]">해지됨</Badge>
                )}
              </div>

              {/* 만료/갱신일 */}
              {sub.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  {sub.cancel_at_period_end
                    ? `⚠️ ${formatDate(sub.current_period_end)}에 구독이 만료됩니다`
                    : `다음 결제일: ${formatDate(sub.current_period_end)}`}
                </p>
              )}

              {/* 결제 실패 경고 */}
              {sub.status === "past_due" && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  결제가 실패했습니다. 결제 수단을 업데이트해 주세요.
                </div>
              )}

              {/* Stripe Portal 버튼 */}
              {sub.has_stripe && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handlePortal}
                  disabled={portalLoading}
                >
                  {portalLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <ExternalLink className="h-4 w-4" />}
                  결제 수단 변경 · 구독 관리
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 플랜 업그레이드 (유료 플랜 미구독 시) */}
      {sub && sub.plan === "free" && (
        <>
          <Separator />
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm">플랜 업그레이드</h3>
              <p className="text-sm text-muted-foreground mt-0.5">더 많은 기능을 사용하려면 유료 플랜으로 전환하세요</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Pro */}
              <Card className="border-indigo-200 dark:border-indigo-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-indigo-500" />
                      <span className="font-semibold text-sm">Pro</span>
                    </div>
                    <Badge className="bg-indigo-500 text-white text-[10px]">인기</Badge>
                  </div>
                  <p className="text-xl font-bold">₩49,000<span className="text-sm font-normal text-muted-foreground"> / 월</span></p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-indigo-500 shrink-0" />즐겨찾기 무제한</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-indigo-500 shrink-0" />알림 규칙 50개</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-indigo-500 shrink-0" />AI 입찰가 추천 무제한</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-indigo-500 shrink-0" />PDF 내보내기</li>
                  </ul>
                  <Button
                    className="w-full btn-premium text-white"
                    size="sm"
                    onClick={() => handleUpgrade("pro")}
                    disabled={upgradeLoading === "pro"}
                  >
                    {upgradeLoading === "pro" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Pro 시작하기
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card className="border-violet-200 dark:border-violet-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-violet-500" />
                    <span className="font-semibold text-sm">Enterprise</span>
                  </div>
                  <p className="text-xl font-bold">₩199,000<span className="text-sm font-normal text-muted-foreground"> / 월</span></p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-violet-500 shrink-0" />Pro 모든 기능</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-violet-500 shrink-0" />알림 규칙 무제한</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-violet-500 shrink-0" />팀 멤버 무제한</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-violet-500 shrink-0" />전담 지원 + SLA</li>
                  </ul>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpgrade("enterprise")}
                    disabled={upgradeLoading === "enterprise"}
                  >
                    {upgradeLoading === "enterprise" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Enterprise 시작하기
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
