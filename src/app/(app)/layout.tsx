import type { Metadata } from "next";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: {
    default: "BAIKAL BidSight — AI 입찰·조달 분석",
    template: "%s | BAIKAL BidSight",
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background page-mesh">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
          <p>&copy; 2026 BAIKAL Inc. — BidSight AI 입찰·조달 분석 플랫폼</p>
          <div className="flex items-center gap-6">
            <a href="/terms" className="hover:text-foreground transition-colors">이용약관</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</a>
            <a href="/contact" className="hover:text-foreground transition-colors">문의하기</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
