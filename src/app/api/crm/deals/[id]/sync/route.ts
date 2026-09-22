import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { retryActiveClientDealSync } from "@/lib/sync/sales-crm-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async (requestId) => success(await retryActiveClientDealSync(await requireRequestContext(request), (await params).id, requestId), requestId));
}
