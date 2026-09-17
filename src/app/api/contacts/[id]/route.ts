import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { updateActiveClientContact } from "@/lib/sync/contact-sync-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = requireRequestContext(request);
    const { id } = await params;
    const result = await updateActiveClientContact(context, id, await request.json(), requestId);
    return success(result, requestId);
  });
}
