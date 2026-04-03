import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "Smart Bid Radar에 로그인하여 맞춤 입찰 알림과 분석을 이용하세요.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
