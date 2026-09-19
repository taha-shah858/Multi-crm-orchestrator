import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { retryActiveClientContactOutboundSync } from "@/lib/sync/contact-sync-service";

export const dynamic = "force-dynamic";

/** Manual retry failsafe for a canonical contact already saved locally. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const { id } = await params;
    const result = await retryActiveClientContactOutboundSync(context, id, requestId);
    return success(result, requestId);
  });
}
