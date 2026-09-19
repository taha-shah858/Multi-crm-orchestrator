import { NextResponse, type NextRequest } from "next/server";
import { assertClientAccess, sessionCookieOptions } from "@/lib/auth/auth-service";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, requireAuthenticatedUser } from "@/lib/auth/request-context";
import { AppError } from "@/lib/errors/app-error";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const body = await request.json() as { clientAccountId?: unknown };
    const clientAccountId = typeof body.clientAccountId === "string" ? body.clientAccountId : "";
    if (!clientAccountId) throw new AppError("CLIENT_CONTEXT_REQUIRED", 422, "A client account is required.", "Choose a client account.");
    const user = await requireAuthenticatedUser(request);
    await assertClientAccess(user, clientAccountId);
    const response = NextResponse.json({ success: true, activeClientAccountId: clientAccountId, requestId });
    response.cookies.set(ACTIVE_CLIENT_ACCOUNT_COOKIE, clientAccountId, sessionCookieOptions);
    return response;
  });
}
