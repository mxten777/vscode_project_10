import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "알림 관리",
  description: "키워드·필터 조건에 맞는 새 공고를 이메일로 알림 받으세요.",
  openGraph: {
    title: "알림 관리 | BidSight",
    description: "키워드·필터 조건에 맞는 새 공고를 이메일로 알림 받으세요.",
  },
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
