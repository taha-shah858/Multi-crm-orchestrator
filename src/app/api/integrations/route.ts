import type { NextRequest } from "next/server";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, requireAuthenticatedUser } from "@/lib/auth/request-context";
import { getIntegrationConnectPermissions, listIntegrationConnections } from "@/lib/integrations/integration-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const activeClientAccountId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value ?? null;
    const [connections, permissions] = await Promise.all([
      listIntegrationConnections(user, activeClientAccountId),
      getIntegrationConnectPermissions(user, activeClientAccountId),
    ]);
    return success({ connections, permissions }, requestId);
  });
}
