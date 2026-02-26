"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Star,
  Bell,
  BarChart3,
  LogOut,
  LogIn,
  Menu,
  X,
  Moon,
  Sun,
  Settings,
  User,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { href: "/", label: "공고 검색", icon: Search },
  { href: "/favorites", label: "즐겨찾기", icon: Star },
  { href: "/alerts", label: "알림 관리", icon: Bell },
  { href: "/reports", label: "리포트", icon: BarChart3 },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-xl hover:bg-primary/5 transition-colors"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="sr-only">테마 전환</span>
    </Button>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? undefined } : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? undefined } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // 전체 새로고침으로 모든 캐시/상태 초기화
    window.location.href = "/login";
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다");
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("비밀번호가 변경되었습니다");
      setPwDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("비밀번호 변경 중 오류가 발생했습니다");
    } finally {
      setPwLoading(false);
    }
  };

  const emailInitial = user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <>
    <header className="sticky top-0 z-50 glass">
      {/* Gradient top border line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 transition-all group-hover:scale-105 group-hover:shadow-primary/30">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-base font-bold leading-tight tracking-tight">입찰분석</span>
            <span className="text-[10px] font-medium text-muted-foreground/60 leading-none">AI Procurement Platform</span>
          </div>
        </Link>

        {/* Desktop Nav — Pill style */}
        <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-muted/40 p-1 border border-border/40">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-1.5 rounded-xl px-4 h-9 transition-all duration-200 ${
                    active
                      ? "bg-background shadow-sm font-semibold text-primary border border-border/60"
                      : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span className="text-[13px]">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-xl">
                  <Avatar className="h-9 w-9 border-2 border-primary/15 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary font-bold text-sm">
                      {emailInitial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">내 계정</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
                  <User className="h-4 w-4" />
                  프로필
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer" onClick={() => setPwDialogOpen(true)}>
                  <KeyRound className="h-4 w-4" />
                  비밀번호 변경
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive rounded-lg cursor-pointer" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm" className="gap-1.5 rounded-xl px-5 h-9 btn-premium text-white font-semibold">
                <LogIn className="h-4 w-4" />
                로그인
              </Button>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 rounded-xl"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border/40 px-4 pb-4 pt-3 space-y-1 animate-fade-up glass">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-2.5 rounded-xl ${
                    active ? "bg-primary/10 text-primary font-semibold border border-primary/15" : ""
                  }`}
                  size="default"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      )}
    </header>

    {/* Password Change Dialog */}
    <Dialog open={pwDialogOpen} onOpenChange={(open) => { setPwDialogOpen(open); if (!open) { setNewPassword(""); setConfirmPassword(""); setShowNewPw(false); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            비밀번호 변경
          </DialogTitle>
          <DialogDescription>
            새 비밀번호를 입력하세요 (6자 이상)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="new-pw" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">새 비밀번호</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNewPw ? "text" : "password"}
                placeholder="6자 이상 입력"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPw(!showNewPw)}
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">비밀번호 확인</Label>
            <Input
              id="confirm-pw"
              type="password"
              placeholder="비밀번호 재입력"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다</p>
            )}
          </div>
          <Button
            className="w-full h-11 text-base font-semibold btn-premium text-white rounded-xl"
            onClick={handleChangePassword}
            disabled={pwLoading || newPassword.length < 6 || newPassword !== confirmPassword}
          >
            {pwLoading ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
