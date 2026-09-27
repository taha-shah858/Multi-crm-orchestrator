import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { syncDealToClickUp } from "@/lib/agent-crm/agent-sales-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dealId: string }> },
) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const { dealId } = await context.params;
    const result = await syncDealToClickUp(dealId, user.id, { throwOnError: true });
    return success(result as unknown as Record<string, unknown>, requestId);
  });
}
