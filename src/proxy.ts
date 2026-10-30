import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep this literal local to the Edge-compatible proxy. Importing the server
// request-context module would also load Prisma through the auth service.
const SESSION_COOKIE = "multi_crm_session";

/**
 * Next.js 16 Proxy performs optimistic route redirects only. Server routes use
 * `requireRequestContext` for the authoritative request-level check.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/accept-invite") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname === "/connect-zoho";

  if (!sessionCookie && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
