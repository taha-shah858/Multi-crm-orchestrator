import type { NextRequest } from "next/server";
import { requireAuthenticatedUser, requireRequestContext } from "@/lib/auth/request-context";
import {
  listAgentSales,
  syncDealToClickUp,
} from "@/lib/agent-crm/agent-sales-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { readReconciliationFilters } from "@/lib/operations/reconciliation";
import { AppError } from "@/lib/errors/app-error";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const result = await listAgentSales(context.user, readReconciliationFilters(request.nextUrl.searchParams), context.activeClientAccountId);
    return success(result, requestId);
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    if (user.role !== "AGENT") throw new AppError("FORBIDDEN", 403, "Agent access required.", "Only sales agents can sync their deals to ClickUp.");
    const body = (await request.json().catch(() => ({}))) as { dealId?: string };

    if (body.dealId) {
      const result = await syncDealToClickUp(body.dealId, user.id, { throwOnError: true });
      return success(result as unknown as Record<string, unknown>, requestId);
    }

    // Batch sync all agent's closed deals
    const salesData = await listAgentSales(user);
    const results = [];
    for (const sale of salesData.sales) {
      try {
        const res = await syncDealToClickUp(sale.id, user.id);
        results.push({ dealId: sale.id, ...res });
      } catch (error) {
        // One inaccessible/broken deal must not erase earlier successful results.
        results.push({ dealId: sale.id, success: false, action: "SKIPPED", error: error instanceof AppError ? error.safeMessage : "This deal could not be synced. Check its saved status before retrying." });
      }
    }

    return success({ results, syncedCount: results.filter(result => result.success).length, failedCount: results.filter(result => !result.success).length }, requestId);
  });
}
