import { NextResponse, type NextRequest } from "next/server";
import { assertClientAccess, listAccessibleClientAccounts, sessionCookieOptions } from "@/lib/auth/auth-service";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, requireAuthenticatedUser } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const clientAccounts = await listAccessibleClientAccounts(user);
    const selectedId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value;
    const selectedIsAccessible = selectedId
      ? await assertClientAccess(user, selectedId).then(() => true).catch(() => false)
      : false;
    const activeClientAccountId = selectedIsAccessible
      ? selectedId
      : clientAccounts[0]?.id ?? null;

    // A first-time agent has no client-selection cookie yet. Persist the
    // safe default returned to the UI so subsequent client-scoped API calls
    // receive the same server-side context as the visible selector.
    const response = NextResponse.json({ success: true, user, clientAccounts, activeClientAccountId, requestId });
    if (activeClientAccountId && !selectedIsAccessible) {
      response.cookies.set(ACTIVE_CLIENT_ACCOUNT_COOKIE, activeClientAccountId, sessionCookieOptions);
    }
    return response;
  });
}
