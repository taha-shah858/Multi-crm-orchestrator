import type { NextRequest } from "next/server";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, requireAuthenticatedUser } from "@/lib/auth/request-context";
import { runIntegrationSync } from "@/lib/integrations/integration-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const activeClientAccountId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value ?? null;
    return success({ sync: await runIntegrationSync(user, (await params).id, requestId, activeClientAccountId) }, requestId);
  });
}
