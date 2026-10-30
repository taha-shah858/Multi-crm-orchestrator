import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { removeIntegration } from "@/lib/integrations/integration-service";
import { assertSameOrigin } from "@/lib/integrations/zoho/connection-requests";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async requestId => {
    assertSameOrigin(request);
    const user = await requireAuthenticatedUser(request);
    const input = await request.json();
    await removeIntegration(user, (await params).id, input?.confirmedConnectionId);
    return success({ removed: true, recordsPreserved: true }, requestId);
  });
}
