import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { getActiveClientContacts } from "@/lib/sync/contact-sync-service";

export const dynamic = "force-dynamic";

/** Returns canonical contacts for the agent's currently selected client account. */
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const contacts = await getActiveClientContacts(context);
    return success({ contacts }, requestId);
  });
}
