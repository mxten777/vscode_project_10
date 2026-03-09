import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// 로그인이 필요한 경로
const PROTECTED_PATHS = ["/favorites", "/alerts", "/reports"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 보호 경로가 아니면 통과
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/favorites", "/favorites/:path*", "/alerts", "/alerts/:path*", "/reports", "/reports/:path*"],
};
