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
    default: "BidSight — 공공입찰 공고 탐색과 선별 지원",
    template: "%s | BidSight",
  },
  description: "나라장터 공공입찰 공고를 자동으로 모으고, 필요한 공고를 빠르게 찾고, 놓치지 않게 관리하도록 돕는 입찰 지원 서비스.",
  keywords: ["입찰", "나라장터", "공공조달", "공고검색", "공고알림", "낙찰분석", "조달청"],
  authors: [{ name: "BidSight" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://bid-platform.vercel.app",
    siteName: "BidSight",
    title: "BidSight — 공공입찰 공고 탐색과 선별 지원",
    description: "나라장터 공고를 자동으로 모으고, 필요한 공고를 빠르게 찾고, 놓치지 않게 관리하도록 돕는 서비스.",
  },
  twitter: {
    card: "summary",
    title: "BidSight — 공공입찰 공고 탐색과 선별 지원",
    description: "나라장터 공고를 자동으로 모으고, 필요한 공고를 빠르게 찾고 놓치지 않게 돕는 서비스.",
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
