import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";
import { commissionReportResponse, getCommissionReport } from "@/lib/operations/commission-report-service";
import { readReconciliationFilters } from "@/lib/operations/reconciliation";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async () => commissionReportResponse(await getCommissionReport(await requireAuthenticatedUser(request), undefined, readReconciliationFilters(request.nextUrl.searchParams))));
}
