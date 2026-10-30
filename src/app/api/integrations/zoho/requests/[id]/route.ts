import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { AppError } from "@/lib/errors/app-error";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { approveZohoRequest, assertSameOrigin, revokeZohoRequest } from "@/lib/integrations/zoho/connection-requests";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async requestId => {
    assertSameOrigin(request);
    const actor = await requireAuthenticatedUser(request);
    const { id } = await context.params;
    const body = await request.json();
    if (body.action === "approve") return success(await approveZohoRequest(actor, id, body), requestId);
    if (body.action === "revoke") return success(await revokeZohoRequest(actor, id), requestId);
    throw new AppError("INVALID_REQUEST", 422, "Invalid request action.", "Choose Approve or Revoke.");
  });
}
