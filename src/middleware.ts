import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash Redis 기반 분산 Rate Limiter
// 환경변수 미설정 시 rate limiting을 건너뜀 (개발 환경 대응)
function buildRatelimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return {
    // 인증 엔드포인트: 5분에 10회 (브루트포스 방지)
    auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "5 m"), prefix: "rl:auth" }),
    // 일반 API: 1분에 60회
    api:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "rl:api" }),
  };
}

const limiters = buildRatelimiters();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate Limiting (Upstash Redis — 분산 환경 적용) ────────
  if (limiters && pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const isAuth = pathname.startsWith("/api/auth/");
    const limiter = isAuth ? limiters.auth : limiters.api;
    const key = `${ip}`;

    const { success, limit, remaining, reset } = await limiter.limit(key);
    if (!success) {
      return new NextResponse(
        JSON.stringify({ code: "RATE_LIMIT", message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
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
