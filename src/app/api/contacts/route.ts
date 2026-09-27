import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { getActiveClientContacts } from "@/lib/sync/contact-sync-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const scope = request.nextUrl.searchParams.get("scope");
    const clientAccountId = request.nextUrl.searchParams.get("clientAccountId") || undefined;
    const contacts = await getActiveClientContacts(context, {
      scope: scope === "agency" ? "agency" : "client",
      clientAccountId,
    });
    return success({ contacts }, requestId);
  });
}
