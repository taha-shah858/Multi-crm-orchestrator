import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { updateActiveClientCompany } from "@/lib/sync/sales-crm-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async (requestId) => success(await updateActiveClientCompany(await requireRequestContext(request), (await params).id, await request.json(), requestId), requestId));
}
