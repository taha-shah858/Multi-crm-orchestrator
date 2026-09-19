import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieOptions, signUp } from "@/lib/auth/auth-service";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, SESSION_COOKIE } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const result = await signUp(await request.json());
    const response = NextResponse.json({ success: true, user: result.user, requestId }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, result.session.token, sessionCookieOptions);
    response.cookies.set(ACTIVE_CLIENT_ACCOUNT_COOKIE, result.defaultClientAccountId, sessionCookieOptions);
    return response;
  });
}
