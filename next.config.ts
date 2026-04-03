import type { NextConfig } from "next";

const securityHeaders = [
  // 클릭재킹 방지 (OWASP A05)
  { key: "X-Frame-Options", value: "DENY" },
  // MIME 스니핑 방지
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 레퍼러 정책
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // XSS 필터 (레거시 브라우저 대응)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // DNS 프리페치 비활성화
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HTTPS 강제 (1년, 서브도메인 포함)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // 권한 정책 — 불필요한 브라우저 API 비활성화
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Content Security Policy (기본값 — 운영 환경에서 점진적으로 강화)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js RSC 호환
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://*.upstash.io",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Stripe Webhook: raw body 처리를 위해 body parser 설정 유지
  // (Next.js Route Handler는 기본적으로 raw body 지원 — 별도 설정 불필요)
};

export default nextConfig;
