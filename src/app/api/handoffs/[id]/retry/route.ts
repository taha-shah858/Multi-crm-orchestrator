import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { retryDealHandoff } from "@/lib/handoff/handoff-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const { id } = await params;
    const handoff = await retryDealHandoff(context, id);
    return success({ handoff }, requestId);
  });
}
