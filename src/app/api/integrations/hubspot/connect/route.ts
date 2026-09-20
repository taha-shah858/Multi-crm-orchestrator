import type { NextRequest } from "next/server";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, requireAuthenticatedUser } from "@/lib/auth/request-context";
import { beginHubSpotOAuth } from "@/lib/integrations/integration-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json() as Record<string, unknown>;
    const activeClientAccountId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value ?? null;
    return success(await beginHubSpotOAuth(user, body, activeClientAccountId), requestId, 201);
  });
}
