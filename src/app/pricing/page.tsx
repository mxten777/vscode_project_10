"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Zap, Building2, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const PLANS = [
  {
    key:   "free",
    name:  "Free",
    price: "무료",
    period: "",
    description: "개인 입찰 정보 탐색에 최적화",
    icon:  Shield,
    color: "text-slate-500",
    border: "border-slate-200 dark:border-slate-700",
    badge: null,
    features: [
      "공고 조회 · 검색 · 필터",
      "즐겨찾기 최대 50건",
      "알림 규칙 최대 3개",
      "낙찰 통계 기본 조회",
      "보고서 차트 조회",
    ],
    cta:    "현재 플랜",
    ctaDisabled: true,
  },
  {
    key:   "pro",
    name:  "Pro",
    price: "₩49,000",
    period: "/ 월",
    description: "전문 입찰 담당자를 위한 완전한 기능",
    icon:  Zap,
    color: "text-indigo-500",
    border: "border-indigo-500",
    badge: "가장 인기",
    features: [
      "Free 플랜 모든 기능 포함",
      "즐겨찾기 무제한",
      "알림 규칙 최대 50개",
      "낙찰 통계 고급 분석",
      "입찰가 AI 추천 (무제한)",
      "보고서 PDF 내보내기",
      "이메일 우선 지원",
    ],
    cta: "Pro 시작하기",
    ctaDisabled: false,
  },
  {
    key:   "enterprise",
    name:  "Enterprise",
    price: "₩199,000",
    period: "/ 월",
    description: "대기업·공공기관 조달팀을 위한 맞춤 솔루션",
    icon:  Building2,
    color: "text-violet-500",
    border: "border-violet-500",
    badge: "팀 플랜",
    features: [
      "Pro 플랜 모든 기능 포함",
      "알림 규칙 무제한",
      "팀 멤버 초대 · 권한 관리",
      "맞춤 보고서 템플릿",
      "API 접근 (API Key 발급)",
      "전담 고객 성공 매니저",
      "SLA 99.9% 보장",
    ],
    cta: "Enterprise 시작하기",
    ctaDisabled: false,
  },
] as const;

type PlanKey = "pro" | "enterprise";

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleUpgrade(plan: string) {
    if (plan === "free") return;
    setLoading(plan as PlanKey);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        router.push("/login?redirect=/pricing");
        return;
      }

      const data = await res.json();

      if (data.code === "STRIPE_NOT_CONFIGURED") {
        setErrorMsg("결제 시스템을 준비 중입니다. 븬로스 베타 기간에는 무료로 제공됩니다.");
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.message ?? "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (data.url) window.location.href = data.url;
    } catch {
      setErrorMsg("네트워크 오류입니다. 인터넷 연결을 확인해 주세요.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      {/* 헤더 */}
      <div className="mx-auto max-w-3xl text-center mb-12">
        <Badge variant="outline" className="mb-4 text-indigo-500 border-indigo-400">
          투명한 요금제
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          최적의 플랜을 선택하세요
        </h1>
        <p className="text-muted-foreground text-lg">
          나라장터 공공 입찰을 더 스마트하게. 언제든 플랜을 변경할 수 있습니다.
        </p>
      </div>

      {/* 오류 메시지 및 준비중 안내 */}
      {errorMsg && (
        <div className="mx-auto max-w-2xl mb-8 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-5 py-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 플랜 카드 */}
      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loading === plan.key;
          return (
            <Card
              key={plan.key}
              className={`relative flex flex-col border-2 ${plan.border} ${
                plan.key === "pro" ? "shadow-lg shadow-indigo-500/10" : ""
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={`px-3 py-1 text-xs font-semibold ${
                    plan.key === "pro"
                      ? "bg-indigo-500 text-white"
                      : "bg-violet-500 text-white"
                  }`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-8 pb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  plan.key === "pro" ? "bg-indigo-500/10" :
                  plan.key === "enterprise" ? "bg-violet-500/10" : "bg-slate-500/10"
                }`}>
                  <Icon className={`w-5 h-5 ${plan.color}`} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="font-semibold text-base mt-1">{plan.name}</p>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-6">
                {/* 기능 목록 */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${plan.color}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA 버튼 */}
                <Button
                  className="w-full"
                  variant={plan.key === "pro" ? "default" : plan.key === "enterprise" ? "outline" : "ghost"}
                  disabled={plan.ctaDisabled || isLoading}
                  onClick={() => handleUpgrade(plan.key)}
                >
                  {isLoading ? "처리 중..." : plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 하단 안내 */}
      <div className="mx-auto max-w-2xl text-center mt-12 space-y-2">
        <p className="text-sm text-muted-foreground">
          모든 유료 플랜은 <strong>14일 무료 체험</strong> 후 결제가 시작됩니다.
          언제든지 취소할 수 있습니다.
        </p>
        <p className="text-sm text-muted-foreground">
          Enterprise 플랜 맞춤 견적이 필요하신가요?{" "}
          <a href="mailto:sales@bidsight.co.kr" className="underline text-foreground hover:text-indigo-500">
            영업팀 문의
          </a>
        </p>
      </div>
    </main>
  );
}
