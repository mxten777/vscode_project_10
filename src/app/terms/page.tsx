import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "이용약관" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← 홈으로
          </Link>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2">이용약관</h1>
        <p className="text-muted-foreground text-sm mb-10">최종 수정일: 2026년 1월 1일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-lg font-bold mb-3">제1조 (목적)</h2>
            <p className="text-muted-foreground leading-relaxed">
              본 약관은 BAIKAL Inc.(이하 "회사")가 운영하는 BidSight AI 입찰·조달 분석 플랫폼(이하 "서비스")의 이용 조건 및 절차,
              회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제2조 (정의)</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>"서비스"란 회사가 제공하는 공공 입찰 정보 수집·분석·알림 서비스를 의미합니다.</li>
              <li>"이용자"란 본 약관에 동의하고 서비스를 이용하는 개인 또는 법인을 의미합니다.</li>
              <li>"계정"이란 이용자가 서비스 이용을 위해 등록한 이메일 및 비밀번호 조합을 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제3조 (약관의 효력 및 변경)</h2>
            <p className="text-muted-foreground leading-relaxed">
              회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지를 통해 시행됩니다.
              변경 약관 시행일 이후 서비스를 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제4조 (서비스 이용)</h2>
            <p className="text-muted-foreground leading-relaxed">
              서비스는 나라장터 공공데이터를 기반으로 제공되며, 데이터의 정확성·완전성을 보증하지 않습니다.
              이용자는 서비스 정보를 참고 목적으로만 활용해야 하며, 실제 입찰 결정은 이용자 본인의 책임 하에 이루어져야 합니다.
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
              <li>타인의 계정을 무단으로 사용하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>서비스에서 얻은 정보를 무단으로 복제·배포하는 행위</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">위 행위는 금지되며, 위반 시 이용이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제5조 (책임의 한계)</h2>
            <p className="text-muted-foreground leading-relaxed">
              회사는 천재지변, 기간통신사업자의 서비스 중지, 시스템 장애 등 불가항력적인 사유로 인한 서비스 중단에 대해
              책임을 지지 않습니다. 서비스를 통해 제공되는 입찰 정보는 참고용이며, 이를 기반으로 한 사업적 결정에 대한
              손해에 대해 회사는 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제6조 (문의)</h2>
            <p className="text-muted-foreground leading-relaxed">
              이용약관에 관한 문의사항은 아래로 연락해 주세요.
            </p>
            <div className="mt-3 p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              <p><strong>BAIKAL Inc.</strong></p>
              <p>이메일: contact@baikal.ai</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
