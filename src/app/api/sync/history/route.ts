import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { getActiveClientSyncHistory } from "@/lib/sync/contact-sync-service";

export const dynamic = "force-dynamic";

/** Returns recent manual sync runs for the active client account only. */
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = requireRequestContext(request);
    const runs = await getActiveClientSyncHistory(context);
    return success({ runs }, requestId);
  });
}
