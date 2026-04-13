import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = { title: "요금제 & 결제" };

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        불러오는 중...
      </div>
    }>
      {children}
    </Suspense>
  );
}
