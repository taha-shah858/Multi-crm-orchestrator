import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";
import { commissionReportResponse, getCommissionReport } from "@/lib/operations/commission-report-service";
import { readReconciliationFilters } from "@/lib/operations/reconciliation";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async () => {
    const context = await requireRequestContext(request);
    return commissionReportResponse(await getCommissionReport(context.user, context.activeClientAccountId, readReconciliationFilters(request.nextUrl.searchParams)));
  });
}
