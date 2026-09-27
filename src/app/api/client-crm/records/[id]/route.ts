import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { updateClientCrmRecord } from "@/lib/client-crm/client-crm-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const { id } = await params;
    const body = await request.json();
    const payload = body?.data ? { ...body, ...body.data } : body;
    const result = await updateClientCrmRecord(context, id, payload);
    return success(result, requestId);
  });
}
