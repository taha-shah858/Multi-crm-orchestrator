import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { createAgencyDeal } from "@/lib/sync/sales-crm-service";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const body = await request.json();
    const result = await createAgencyDeal(context, body, requestId);
    return success(result, requestId, 201);
  });
}
