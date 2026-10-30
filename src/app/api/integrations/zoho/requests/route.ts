import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { assertSameOrigin, createZohoInvitation, listZohoRequests } from "@/lib/integrations/zoho/connection-requests";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const response = success(await listZohoRequests(await requireAuthenticatedUser(request)), requestId);
    response.headers.set("Cache-Control", "no-store");
    return response;
  });
}
export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    assertSameOrigin(request);
    const actor = await requireAuthenticatedUser(request);
    const body = await request.json();
    const response = success(await createZohoInvitation(actor, typeof body.clientAccountId === "string" ? body.clientAccountId : ""), requestId, 201);
    response.headers.set("Cache-Control", "no-store");
    return response;
  });
}
