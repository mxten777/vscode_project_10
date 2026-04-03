import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "낙찰 분석",
  description:
    "나라장터 낙찰 데이터 통계 — 기관별·업종별·지역별 낙찰률 트렌드와 입찰가 추천을 확인하세요.",
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
