import { NextResponse, type NextRequest } from "next/server";
import { acceptMemberInvite, getInvitationDetails } from "@/lib/members/member-service";
import { sessionCookieOptions } from "@/lib/auth/auth-service";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, SESSION_COOKIE } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const token = request.nextUrl.searchParams.get("token") || "";
    const details = await getInvitationDetails(token);
    return NextResponse.json({ success: true, invitation: details, requestId });
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const body = await request.json();
    const result = await acceptMemberInvite(body);

    const response = NextResponse.json(
      { success: true, user: result.user, requestId },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE, result.session.token, sessionCookieOptions);
    if (result.defaultClientAccountId) {
      response.cookies.set(ACTIVE_CLIENT_ACCOUNT_COOKIE, result.defaultClientAccountId, sessionCookieOptions);
    }

    return response;
  });
}
