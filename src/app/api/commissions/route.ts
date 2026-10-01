import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { createManualCommission, listSalesOperations } from "@/lib/operations/sales-operations-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { readReconciliationFilters } from "@/lib/operations/reconciliation";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success(await listSalesOperations(await requireRequestContext(request), readReconciliationFilters(request.nextUrl.searchParams)), requestId)); }
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ commission: await createManualCommission(await requireRequestContext(request), await request.json(), requestId) }, requestId, 201)); }
