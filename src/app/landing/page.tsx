"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  Radar,
  Search,
  Sparkles,
  ArrowRight,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const flowSteps = [
  {
    icon: Search,
    eyebrow: "Step 1",
    title: "필요한 공고만 먼저 좁힙니다",
    desc: "키워드, 기관, 업종, 예산 기준으로 오늘 검토할 공고만 빠르게 선별합니다.",
  },
  {
    icon: Target,
    eyebrow: "Step 2",
    title: "상세 화면에서 판단 근거를 확인합니다",
    desc: "공고 기본 정보, 낙찰 이력, 관련 데이터까지 한 흐름으로 이어서 봅니다.",
  },
  {
    icon: Bell,
    eyebrow: "Step 3",
    title: "관심 공고를 저장하고 추적합니다",
    desc: "즐겨찾기와 알림 규칙으로 다시 찾는 수고 없이 중요한 공고를 놓치지 않게 합니다.",
  },
  {
    icon: BarChart3,
    eyebrow: "Step 4",
    title: "대시보드에서 전체 흐름을 정리합니다",
    desc: "기관, 업종, 지역 흐름을 요약해서 팀 차원의 검토 우선순위를 빠르게 맞춥니다.",
  },
];

const stats = [
  { value: "4,900+", label: "누적 수집 공고" },
  { value: "280+", label: "누적 낙찰 데이터" },
  { value: "평일 자동", label: "공고 수집 운영" },
];

const heroSignals = [
  { label: "먼저 하는 일", value: "후보 공고 좁히기" },
  { label: "바로 이어지는 일", value: "상세 판단 근거 확인" },
  { label: "마지막 정리", value: "알림 · 분석 · 공유" },
];

const outcomes = [
  {
    icon: Clock3,
    title: "검색 시간을 줄입니다",
    desc: "결과 수를 자랑하기보다, 먼저 검토할 공고를 빠르게 추리는 데 집중합니다.",
  },
  {
    icon: Radar,
    title: "누락 리스크를 낮춥니다",
    desc: "즐겨찾기와 조건별 알림으로 중요한 공고를 다시 놓치지 않도록 구조를 만듭니다.",
  },
  {
    icon: FileSearch,
    title: "판단 근거를 모아줍니다",
    desc: "상세 정보와 낙찰 데이터, 분석 화면을 이어서 보여줘 참여 여부 판단을 돕습니다.",
  },
];

const processPrompts = [
  {
    step: "01",
    title: "지금 먼저 답해야 할 질문",
    desc: "오늘 검토할 공고가 무엇인지 먼저 좁혀야 합니다. 랜딩부터 이 우선순위가 읽히도록 구성했습니다.",
  },
  {
    step: "02",
    title: "다음 화면에서 확인할 판단 근거",
    desc: "상세 화면으로 넘어간 뒤에는 예산, 기관, 낙찰 정보, 후속 추적 필요 여부를 바로 판단하게 만듭니다.",
  },
  {
    step: "03",
    title: "액션 후에 이어지는 다음 단계",
    desc: "저장과 알림에서 멈추지 않고, 다음에 무엇을 해야 하는지 메시지와 모달로 연결되도록 설계했습니다.",
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
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.20) 0%, transparent 72%), linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(244,247,255,0.85) 100%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs">
              <Sparkles className="size-3 text-indigo-500" />
              검색에서 분석까지 한 흐름으로 정리한 입찰 지원 서비스
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight leading-tight sm:text-5xl lg:text-6xl">
              필요한 것만
              <span className="block text-indigo-600">순서대로 보이게</span>
              만드는 입찰 워크플로우
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              BidSight는 공고를 많이 보여주는 제품이 아니라, 오늘 검토할 공고를 고르고, 판단 근거를 확인하고,
              놓치지 않게 관리하는 흐름을 한 화면 구조 안에서 자연스럽게 이어줍니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?tab=signup">
                <Button size="lg" className="btn-premium px-8 text-white">
                  무료로 시작하기 <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="px-8">
                  로그인
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {[
                "공고 선별 속도 중심",
                "즐겨찾기와 알림으로 누락 방지",
                "상세와 분석으로 판단 근거 연결",
              ].map((item) => (
                <div key={item} className="inline-flex items-center gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-2xl border border-indigo-100/80 bg-white/80 px-4 py-4 shadow-[0_18px_40px_rgba(99,102,241,0.08)] backdrop-blur"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500/80">{signal.label}</p>
                  <p className="mt-2 text-sm font-semibold tracking-tight text-slate-900 sm:text-[15px]">{signal.value}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-border/60 bg-white/80 shadow-premium-lg backdrop-blur">
            <CardContent className="p-0">
              <div className="border-b border-border/50 bg-slate-950 px-6 py-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/50">업무 흐름</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight">한 번에 읽히는 업무 흐름</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/70">
                      위에서 아래로
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-6">
                {flowSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="group rounded-2xl border border-border/60 bg-linear-to-r from-slate-50 to-white p-4 transition-all hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                        <step.icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                          {step.eyebrow.replace("Step", "단계")}
                          {index < flowSteps.length - 1 && <ChevronRight className="size-3 text-indigo-300" />}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold tracking-tight">{step.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">이 흐름을 본 뒤 기대 결과</p>
                  <p className="mt-2 text-sm font-semibold tracking-tight text-slate-900">사용자는 기능 목록이 아니라 다음 행동 순서를 이해한 상태로 로그인합니다.</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">그래서 첫 진입부터 검색, 상세 검토, 저장·알림, 분석으로 이어지는 제품 구조를 더 짧게 받아들일 수 있습니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── 증거 스트립 ── */}
      <section className="border-y border-border/40 bg-muted/20 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">왜 정돈돼 보이는가</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">기능 나열이 아니라 판단 흐름 중심으로 정리했습니다</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-border/50 bg-background/90 px-5 py-5 text-center shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
                <div className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 핵심 가치 ── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">핵심 가치</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              사용자에게 먼저 보여줘야 하는 것은 세 가지뿐입니다
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              많은 카드와 설명보다, 실제로 자주 쓰는 업무 효익을 앞에서부터 차례대로 이해할 수 있게 정리했습니다.
            </p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {outcomes.map((item) => (
              <Card key={item.title} className="premium-card overflow-hidden border-border/60">
                <CardContent className="p-7">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600">
                    <item.icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.92))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">프로세스 중심 메시지</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                화면마다 &quot;지금 무엇을 답해야 하는지&quot;가 먼저 보이도록 정리했습니다
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                좋은 UI 는 기능을 예쁘게 배치하는 것이 아니라, 사용자가 현재 단계에서 어떤 결정을 내려야 하는지 바로 이해하게 만드는 것입니다.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3 stagger-children">
              {processPrompts.map((item) => (
                <div key={item.step} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 순서 설명 ── */}
      <section className="bg-slate-950 py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">중요한 것부터 보여주기</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              화면은 위에서 아래로,
              메시지는 앞에서 뒤로 이어집니다
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/65">
              기능을 넓게 펼쳐놓는 대신, 무엇을 먼저 찾고 무엇을 나중에 판단하는지가 보이도록 순서를 남겼습니다.
              그래서 첫인상도 정돈되고 실제 업무 흐름도 더 자연스럽게 이어집니다.
            </p>
          </div>
          <div className="space-y-4">
            {flowSteps.map((step, index) => (
              <div key={step.title} className="rounded-3xl border border-white/10 bg-white/4 p-6 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-indigo-200">
                    <span className="text-sm font-bold">0{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200/80">{step.eyebrow.replace("Step", "단계")}</div>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-indigo-600 to-slate-900 px-8 py-10 text-center text-white shadow-premium-lg sm:px-12 sm:py-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-100/80">바로 시작하기</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              필요한 정보만 차례대로 보여주는 화면으로 시작할 수 있습니다
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70">
              공고 탐색, 즐겨찾기, 알림, 분석까지 이어지는 실제 흐름을 바로 확인해 보세요.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login?tab=signup">
                <Button size="lg" className="bg-white px-8 text-slate-950 hover:bg-white/90">
                  무료 회원가입 <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/5 px-8 text-white hover:bg-white/10">
                  로그인
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
          <p>&copy; 2026 BidSight — 공공입찰 공고 탐색과 선별 지원</p>
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
