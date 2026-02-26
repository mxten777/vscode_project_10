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
} from "lucide-react";
import { toast } from "sonner";

const features = [
  {
    icon: TrendingUp,
    title: "AI 입찰 분석",
    desc: "공공 입찰 공고를 AI로 자동 분석하여 최적의 기회를 발견합니다",
  },
  {
    icon: Bell,
    title: "실시간 알림",
    desc: "관심 키워드에 맞는 새 공고가 올라오면 즉시 알려드립니다",
  },
  {
    icon: Shield,
    title: "안전한 데이터",
    desc: "Supabase RLS 기반의 철저한 데이터 보안을 제공합니다",
  },
  {
    icon: Zap,
    title: "빠른 검색",
    desc: "나라장터 전체 공고를 빠르고 정확하게 검색합니다",
  },
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

  // Sign In
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [orgName, setOrgName] = useState("");

  const supabase = createClient();

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
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">입찰분석</p>
              <p className="text-xs opacity-80">AI Procurement Platform</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight">
                공공 입찰의 새로운
                <br />
                패러다임
              </h1>
              <p className="text-lg opacity-90 max-w-md leading-relaxed">
                AI 기반 실시간 분석으로 최적의 입찰 기회를 
                놓치지 마세요
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col gap-2 rounded-xl bg-white/10 backdrop-blur-sm p-4 transition-colors hover:bg-white/15"
                >
                  <f.icon className="h-5 w-5" />
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs opacity-75 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs opacity-60">
            &copy; 2025 입찰분석 — AI 입찰·조달 분석 플랫폼
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-[420px] animate-fade-up">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">입찰분석</span>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5 lg:border">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">환영합니다</CardTitle>
              <CardDescription className="text-base">
                계정에 로그인하거나 새로 가입하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      className="w-full h-11 text-base font-semibold shadow-sm shadow-primary/25"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "로그인 중..." : "로그인"}
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
                      className="w-full h-11 text-base font-semibold shadow-sm shadow-primary/25"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "가입 중..." : "회원가입"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            로그인함으로써 서비스 이용약관 및 개인정보 처리방침에 동의합니다
          </p>
        </div>
      </div>
    </div>
  );
}
