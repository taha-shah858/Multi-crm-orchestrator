import type { NextRequest } from "next/server";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, requireAuthenticatedUser } from "@/lib/auth/request-context";
import { disconnectIntegration } from "@/lib/integrations/integration-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const activeClientAccountId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value ?? null;
    await disconnectIntegration(user, (await params).id, activeClientAccountId);
    return success({ disconnected: true }, requestId);
  });
}
