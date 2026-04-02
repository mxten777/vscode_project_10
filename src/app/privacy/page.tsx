import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← 홈으로
          </Link>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2">개인정보처리방침</h1>
        <p className="text-muted-foreground text-sm mb-10">최종 수정일: 2026년 1월 1일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-lg font-bold mb-3">1. 수집하는 개인정보 항목</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">회사는 서비스 제공을 위해 다음과 같은 최소한의 개인정보를 수집합니다.</p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">항목</th>
                    <th className="text-left px-4 py-2.5 font-semibold">목적</th>
                    <th className="text-left px-4 py-2.5 font-semibold">보유기간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="px-4 py-2.5">이메일 주소</td>
                    <td className="px-4 py-2.5">계정 식별, 알림 발송</td>
                    <td className="px-4 py-2.5">회원 탈퇴 시까지</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">조직명</td>
                    <td className="px-4 py-2.5">서비스 이용 주체 구분</td>
                    <td className="px-4 py-2.5">회원 탈퇴 시까지</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">서비스 이용기록</td>
                    <td className="px-4 py-2.5">서비스 개선, 장애 대응</td>
                    <td className="px-4 py-2.5">1년</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>서비스 회원 가입 및 관리</li>
              <li>입찰 공고 알림 이메일 발송</li>
              <li>서비스 이용 통계 및 품질 개선</li>
              <li>법령 및 이용약관 위반 행위 대응</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">3. 개인정보의 제3자 제공</h2>
            <p className="text-muted-foreground leading-relaxed">
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 법령에 의거하거나
              수사기관의 요청이 있는 경우에는 예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">4. 개인정보 처리 위탁</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">수탁업체</th>
                    <th className="text-left px-4 py-2.5 font-semibold">위탁 업무</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="px-4 py-2.5">Supabase Inc.</td>
                    <td className="px-4 py-2.5">데이터베이스 및 인증 관리</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Resend Inc.</td>
                    <td className="px-4 py-2.5">이메일 알림 발송</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Vercel Inc.</td>
                    <td className="px-4 py-2.5">서비스 호스팅 및 CDN</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">5. 이용자의 권리</h2>
            <p className="text-muted-foreground leading-relaxed">
              이용자는 언제든지 자신의 개인정보에 대해 열람·정정·삭제·처리정지를 요청할 수 있습니다.
              계정 삭제를 원하시면 하단의 문의 이메일로 요청해 주세요.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">6. 개인정보 보호책임자</h2>
            <div className="p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              <p><strong>BAIKAL Inc.</strong></p>
              <p>개인정보 보호책임자: 대표자</p>
              <p>이메일: privacy@baikal.ai</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
