import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BidSight — AI 입찰·조달 분석 플랫폼",
    template: "%s | BidSight",
  },
  description: "나라장터 공공 입찰 공고를 AI로 자동 분석. 키워드 알림, 즐겨찾기, 통계 리포트까지 — 최적의 입찰 기회를 놓치지 마세요.",
  keywords: ["입찰", "나라장터", "공공조달", "입찰분석", "AI", "공고알림", "조달청"],
  authors: [{ name: "BidSight" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://bid-platform.vercel.app",
    siteName: "BidSight",
    title: "BidSight — AI 입찰·조달 분석 플랫폼",
    description: "나라장터 공공 입찰 공고를 AI로 자동 분석. 키워드 알림, 즐겨찾기, 통계 리포트.",
  },
  twitter: {
    card: "summary",
    title: "BidSight — AI 입찰·조달 분석 플랫폼",
    description: "나라장터 공공 입찰 공고를 AI로 자동 분석.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
