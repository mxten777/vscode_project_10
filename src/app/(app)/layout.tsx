import { Header } from "@/components/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background page-mesh">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
          <p>&copy; 2025 입찰분석 — AI 입찰·조달 분석 플랫폼</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-foreground transition-colors cursor-pointer">이용약관</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">개인정보처리방침</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">문의하기</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
