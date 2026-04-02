"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  Shield,
  Zap,
  TrendingUp,
  Building,
  CheckCircle,
  ArrowRight,
  Sparkles,
  FileText,
  Award,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: TrendingUp,
    title: "AI 낙찰 분석",
    desc: "기관별·업종별·지역별 낙찰 이력을 분석해 최적의 입찰 전략을 제시합니다.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Bell,
    title: "맞춤 알림",
    desc: "원하는 키워드·조건을 등록하면 새 공고가 올라오는 즉시 이메일로 알려드립니다.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Target,
    title: "투찰가 추천",
    desc: "유사 사례 데이터를 기반으로 보수적·표준·공격적 3가지 투찰 전략을 추천합니다.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "빠른 공고 검색",
    desc: "나라장터 전체 공고를 키워드·예산·지역 조건으로 빠르게 검색합니다.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "낙찰 리포트",
    desc: "월별 낙찰 트렌드, 상위 발주기관, 업종별 경쟁률을 한눈에 파악합니다.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "안전한 멀티테넌트",
    desc: "조직 단위 RLS 보안으로 팀원과 안전하게 데이터를 공유합니다.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

const stats = [
  { value: "10만+", label: "공공 입찰 공고", icon: FileText },
  { value: "15개", label: "주요 발주기관", icon: Building },
  { value: "91%↑", label: "평균 낙찰률 정확도", icon: Award },
  { value: "평일 매일", label: "자동 데이터 수집", icon: Zap },
];

const plans = [
  {
    name: "Free",
    price: "무료",
    desc: "개인 사용자에게 최적",
    features: ["공고 검색 월 100건", "알림 규칙 3개", "즐겨찾기 무제한", "기본 리포트"],
    cta: "무료로 시작",
    href: "/login?tab=signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₩99,000",
    period: "/월",
    desc: "입찰 전문 팀에게 최적",
    features: ["공고 검색 무제한", "알림 규칙 50개", "AI 낙찰 분석", "투찰가 추천", "상세 리포트", "팀원 20명"],
    cta: "Pro 시작하기",
    href: "/login?tab=signup",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "별도 협의",
    desc: "대형 조달팀을 위한 맞춤 플랜",
    features: ["모든 Pro 기능", "알림 규칙 무제한", "API 키 발급", "전용 지원", "SLA 보장"],
    cta: "문의하기",
    href: "/contact",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── 네비게이션 ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <BarChart3 className="size-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">BidSight</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">로그인</Button>
            </Link>
            <Link href="/login?tab=signup">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                무료 시작 <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 히어로 ── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs">
            <Sparkles className="size-3 text-indigo-500" />
            나라장터 입찰 공고 AI 분석 플랫폼
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6">
            공공 입찰,
            <br />
            <span className="text-indigo-500">데이터로 이기세요</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            나라장터 전체 공고를 자동 수집하고 낙찰 이력을 분석합니다.<br className="hidden sm:block" />
            맞춤 알림부터 AI 투찰가 추천까지, 입찰 전략의 모든 것을 한 곳에서.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login?tab=signup">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8">
                무료로 시작하기 <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                로그인
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 통계 배너 ── */}
      <section className="border-y border-border/40 bg-muted/20 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-center mb-2">
                  <s.icon className="size-5 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 기능 ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              입찰 담당자를 위한 모든 기능
            </h2>
            <p className="text-muted-foreground text-lg">
              공고 탐색부터 낙찰 분석, 알림, 리포트까지 입찰 업무의 전 과정을 지원합니다.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className={`inline-flex size-10 items-center justify-center rounded-lg ${f.bg} mb-4`}>
                    <f.icon className={`size-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── 요금제 ── */}
      <section className="py-24 bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">투명한 요금제</h2>
            <p className="text-muted-foreground text-lg">
              팀 규모와 필요에 맞게 선택하세요. 언제든지 업그레이드·다운그레이드 가능합니다.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <Card
                key={p.name}
                className={`relative border ${
                  p.highlight
                    ? "border-indigo-500 shadow-lg shadow-indigo-500/10"
                    : "border-border/50"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-600 text-white text-xs px-3">추천</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {p.name}
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-3xl font-bold">{p.price}</span>
                      {p.period && (
                        <span className="text-muted-foreground text-sm pb-0.5">{p.period}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={p.href} className="block">
                    <Button
                      className={`w-full ${
                        p.highlight
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : ""
                      }`}
                      variant={p.highlight ? "default" : "outline"}
                    >
                      {p.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            지금 바로 무료로 시작하세요
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            신용카드 필요 없이 무료 플랜으로 시작할 수 있습니다.
          </p>
          <Link href="/login?tab=signup">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-10">
              무료 회원가입 <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
          <p>&copy; 2026 BidSight — AI 입찰·조달 분석 플랫폼</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">문의하기</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
