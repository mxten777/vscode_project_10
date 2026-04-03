import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "팀 관리",
  description: "조직 멤버를 초대하고 역할을 관리하세요.",
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

