import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/auth/auth-service";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, SESSION_COOKIE } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    await deleteSession(request.cookies.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ success: true, requestId });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(ACTIVE_CLIENT_ACCOUNT_COOKIE);
    return response;
  });
}
