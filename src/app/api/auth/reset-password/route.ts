import { NextResponse, type NextRequest } from "next/server";
import { resetPassword } from "@/lib/auth/password-reset-service";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, SESSION_COOKIE } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const result = await resetPassword(await request.json());
    const response = NextResponse.json({ success: true, ...result, requestId });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(ACTIVE_CLIENT_ACCOUNT_COOKIE);
    return response;
  });
}
