import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "팀 초대 수락",
  robots: { index: false, follow: false },
};

export default function InviteAcceptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense>{children}</Suspense>;
}
