import type { Metadata } from "next";
import { Header } from "@/components/header";
import { IngestionStatusBanner } from "@/components/ingestion-status";

export const metadata: Metadata = {
  title: {
    default: "BidSight — 공공입찰 공고 탐색과 선별 지원",
    template: "%s | BidSight",
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background page-mesh">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        <IngestionStatusBanner />
        {children}
      </main>
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
          <p>&copy; 2026 BidSight — 공공입찰 공고 탐색과 선별 지원</p>
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
