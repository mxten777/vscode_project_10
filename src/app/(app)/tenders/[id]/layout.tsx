import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("tenders")
      .select("title, budget_amount, status")
      .eq("id", id)
      .single();

    if (data) {
      return {
        title: data.title,
        description: `${data.title} — 나라장터 입찰 공고 상세 정보. 예산·일정·낙찰 분석을 확인하세요.`,
        openGraph: {
          title: data.title,
          description: `나라장터 입찰 공고 상세 정보`,
        },
      };
    }
  } catch {
    // fallback
  }

  return {
    title: "공고 상세",
    description: "나라장터 입찰 공고 상세 정보를 확인하세요.",
  };
}

export default function TenderDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
