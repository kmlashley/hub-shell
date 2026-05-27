import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase-middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the auth callback through without session refresh — it handles
  // the PKCE code exchange and would break if we touch cookies first.
  if (pathname.startsWith("/api/auth/callback") || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  // Skip auth for the cron-triggered research endpoint (authenticated by CRON_SECRET)
  // and for static assets.
  if (
    pathname.startsWith("/api/research/run-all") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow the login page through (obviously)
  if (pathname.startsWith("/login")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // All other routes: require an authenticated Supabase session.
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
