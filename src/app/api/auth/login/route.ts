import { NextResponse, type NextRequest } from "next/server";
import { signIn, sessionCookieOptions } from "@/lib/auth/auth-service";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, SESSION_COOKIE } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const result = await signIn(await request.json());
    const response = NextResponse.json({ success: true, user: result.user, requestId });
    response.cookies.set(SESSION_COOKIE, result.session.token, sessionCookieOptions);
    response.cookies.delete(ACTIVE_CLIENT_ACCOUNT_COOKIE);
    return response;
  });
}
