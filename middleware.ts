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

  // Skip auth for the research orchestrator and the sub-agents it calls
  // server-to-server (they carry no browser session cookie). These are
  // gated instead by the CRON_SECRET shared-secret check inside each route —
  // see lib/research/internal-auth.ts. Also skip for static assets.
  if (
    pathname.startsWith("/api/research/run-all") ||
    pathname === "/api/research/keyword" ||
    pathname === "/api/research/competitive" ||
    pathname === "/api/research/content-trends" ||
    pathname === "/api/research/audience" ||
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
