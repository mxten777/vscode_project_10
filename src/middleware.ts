import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit 설정
const RATE_LIMITS = {
  // 인증 엔드포인트: 5분에 10회 (브루트포스 방지)
  auth: { windowMs: 5 * 60 * 1000, max: 10 },
  // 일반 API: 1분에 60회
  api:  { windowMs: 60 * 1000,      max: 60 },
};

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate Limiting ──────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const isAuth = pathname.startsWith("/api/auth/");
    const config = isAuth ? RATE_LIMITS.auth : RATE_LIMITS.api;
    const key = `${isAuth ? "auth" : "api"}:${ip}`;

    const result = rateLimit(key, config);
    if (!result.success) {
      return new NextResponse(
        JSON.stringify({ code: "RATE_LIMIT", message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(config.max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
          },
        }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 갱신
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호 경로: 로그인 안 된 사용자 → /login 리다이렉트
  const protectedPaths = ["/favorites", "/alerts", "/reports", "/analytics"];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 비로그인 사용자가 / 접근 시 → /landing 리다이렉트
  if (!user && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/landing", request.url));
  }

  // 로그인 상태에서 /login 또는 /landing 접근 시 → /
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/landing")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/jobs).*)",
  ],
};
