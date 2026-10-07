import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { readReconciliationFilters } from "@/lib/operations/reconciliation";
import { getTimeAudit, saveHourlyRate, timeAuditCsv } from "@/lib/operations/time-audit-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const params = request.nextUrl.searchParams;
    const csv = params.get("format") === "csv";
    const report = await getTimeAudit(await requireAuthenticatedUser(request), readReconciliationFilters(params), params.get("clientId") || undefined, Number(params.get("page") || 1), csv);
    return csv ? new Response(timeAuditCsv(report), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="time-audit.csv"', "Cache-Control": "no-store" } }) : success({ report }, requestId);
  });
}
export async function PATCH(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => success({ rate: await saveHourlyRate(await requireAuthenticatedUser(request), await request.json()) }, requestId));
}
