import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "리포트",
  description: "나라장터 공공 입찰 데이터를 기반으로 한 기간별 통계 리포트.",
  openGraph: {
    title: "리포트 | BidSight",
    description: "나라장터 공공 입찰 데이터를 기반으로 한 기간별 통계 리포트.",
  },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
