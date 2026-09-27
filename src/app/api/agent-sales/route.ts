import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import {
  listAgentSales,
  syncDealToClickUp,
} from "@/lib/agent-crm/agent-sales-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const result = await listAgentSales(user);
    return success(result, requestId);
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json().catch(() => ({}))) as { dealId?: string };

    if (body.dealId) {
      const result = await syncDealToClickUp(body.dealId, user.id, { throwOnError: true });
      return success(result as unknown as Record<string, unknown>, requestId);
    }

    // Batch sync all agent's closed deals
    const salesData = await listAgentSales(user);
    const results = [];
    for (const sale of salesData.sales) {
      const res = await syncDealToClickUp(sale.id, user.id);
      results.push({ dealId: sale.id, ...res });
    }

    return success({ results }, requestId);
  });
}
