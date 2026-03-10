import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "즐겨찾기",
  description: "관심 있는 입찰 공고를 모아보세요.",
  openGraph: {
    title: "즐겨찾기 | BidSight",
    description: "관심 있는 입찰 공고를 모아보세요.",
  },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
