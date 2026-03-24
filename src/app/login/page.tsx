"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Shield,
  Zap,
  TrendingUp,
  Bell,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const features = [
  {
    icon: TrendingUp,
    title: "AI 입찰 분석",
    desc: "공공 입찰 공고를 AI로 자동 분석하여 최적의 입찰 기회를 발견합니다",
    color: "from-indigo-500/20 to-blue-500/20",
  },
  {
    icon: Bell,
    title: "실시간 알림",
    desc: "관심 키워드에 맞는 새 공고가 올라오면 즉시 알림을 보내드립니다",
    color: "from-violet-500/20 to-purple-500/20",
  },
  {
    icon: Shield,
    title: "안전한 데이터",
    desc: "Supabase RLS 기반의 철저한 데이터 보안을 제공합니다",
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    icon: Zap,
    title: "빠른 검색",
    desc: "나라장터 전체 공고를 빠르고 정확하게 검색합니다",
    color: "from-amber-500/20 to-orange-500/20",
  },
];

const stats = [
  { value: "10K+", label: "공공 입찰 공고" },
  { value: "99.9%", label: "서비스 가동률" },
  { value: "실시간", label: "데이터 수집" },
];

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetDone, setResetDone] = useState(false);

  // Sign In
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [orgName, setOrgName] = useState("");

  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setResetDone(true);
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("로그인 성공");
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error("로그인 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signUpEmail,
          password: signUpPassword,
          orgName: orgName || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "회원가입 실패");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: signUpEmail,
        password: signUpPassword,
      });
      if (error) {
        toast.error("가입은 완료! 로그인을 시도하세요.");
        return;
      }

      toast.success("회원가입 + 로그인 완료");
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error("회원가입 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Hero Panel — Animated Mesh Gradient */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-indigo-950 via-indigo-900 to-violet-950" />

        {/* Animated mesh orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] h-125 w-125 rounded-full bg-indigo-600/30 blur-[100px] animate-mesh" />
          <div className="absolute bottom-[-15%] right-[-10%] h-150 w-150 rounded-full bg-violet-600/25 blur-[120px] animate-mesh" style={{ animationDelay: "-7s" }} />
          <div className="absolute top-[50%] left-[40%] h-87.5 w-87.5 rounded-full bg-blue-500/20 blur-[80px] animate-mesh" style={{ animationDelay: "-13s" }} />
          <div className="absolute top-[20%] right-[10%] h-50 w-50 rounded-full bg-cyan-400/15 blur-[60px] animate-mesh" style={{ animationDelay: "-5s" }} />
        </div>

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg shadow-indigo-900/30">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight tracking-tight">입찰분석</p>
              <p className="text-xs text-white/50 font-medium">AI Procurement Platform</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="space-y-10 max-w-lg">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                AI 기반 자동 분석 시스템
              </div>
              <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight">
                공공 입찰의
                <br />
                <span className="bg-linear-to-r from-indigo-300 via-blue-200 to-violet-300 bg-clip-text text-transparent">새로운 패러다임</span>
              </h1>
              <p className="text-lg text-white/60 leading-relaxed max-w-md">
                AI 기반 실시간 분석으로 최적의 입찰 기회를
                놓치지 마세요. 데이터가 말해주는 인사이트.
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group flex flex-col gap-2.5 rounded-2xl bg-white/6 backdrop-blur-sm border border-white/8 p-4 transition-all duration-300 hover:bg-white/10 hover:border-white/15 hover:scale-[1.02]"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br ${f.color}`}>
                    <f.icon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/30">
            &copy; 2025 입찰분석 — AI 입찰·조달 분석 플랫폼
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex w-full lg:w-[45%] items-center justify-center bg-background px-6 py-12 relative overflow-y-auto">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 hero-gradient opacity-50" />

        <div className="relative z-10 w-full max-w-110 animate-fade-up">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">입찰분석</span>
          </div>

          <Card className="premium-card border-0 shadow-2xl shadow-primary/5 overflow-hidden">
            {/* Card shimmer top border */}
            <div className="h-0.5 w-full bg-linear-to-r from-transparent via-primary/40 to-transparent" />

            <CardHeader className="text-center pb-2 pt-8">
              <CardTitle className="text-2xl font-bold tracking-tight">환영합니다</CardTitle>
              <CardDescription className="text-base">
                계정에 로그인하거나 새로 가입하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="signin">로그인</TabsTrigger>
                  <TabsTrigger value="signup">회원가입</TabsTrigger>
                </TabsList>

                {/* 로그인 */}
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">이메일</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="email@example.com"
                        required
                        autoComplete="email"
                        className="h-11"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">비밀번호</Label>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => { setResetMode(true); setResetEmail(signInEmail); }}
                        >
                          비밀번호 찾기
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          className="h-11 pr-10"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="w-full h-12 text-base font-semibold btn-premium text-white rounded-xl gap-2"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "로그인 중..." : <><span>로그인</span><ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </TabsContent>

                {/* 회원가입 */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">이메일</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="email@example.com"
                        required
                        autoComplete="email"
                        className="h-11"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">비밀번호</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="6자 이상"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="h-11"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-name">
                        조직명 <span className="text-muted-foreground font-normal">(선택)</span>
                      </Label>
                      <Input
                        id="org-name"
                        placeholder="우리 회사"
                        className="h-11"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full h-12 text-base font-semibold btn-premium text-white rounded-xl gap-2"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "가입 중..." : <><span>회원가입</span><ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-xs text-muted-foreground/70">
            로그인함으로써 서비스 이용약관 및 개인정보 처리방침에 동의합니다
          </p>
        </div>
      </div>

      {/* 비밀번호 찾기 오버레이 */}
      {resetMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-8 animate-fade-up">
            {resetDone ? (
              <div className="text-center space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mx-auto">
                  <ArrowRight className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-lg font-bold">이메일을 확인하세요</p>
                <p className="text-sm text-muted-foreground">
                  <strong>{resetEmail}</strong>로 비밀번호 재설정 링크를 보냈습니다.
                  스팸함도 확인해주세요.
                </p>
                <Button className="w-full h-11 rounded-xl" onClick={() => { setResetMode(false); setResetDone(false); }}>
                  로그인으로 돌아가기
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-1">비밀번호 찾기</h2>
                <p className="text-sm text-muted-foreground mb-6">가입하신 이메일로 재설정 링크를 보내드립니다.</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">이메일</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="email@example.com"
                      required
                      className="h-11"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                  <Button className="w-full h-11 rounded-xl font-semibold btn-premium text-white" type="submit" disabled={loading}>
                    {loading ? "전송 중..." : "재설정 링크 보내기"}
                  </Button>
                  <Button variant="ghost" className="w-full h-11 rounded-xl" type="button" onClick={() => setResetMode(false)}>
                    취소
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
