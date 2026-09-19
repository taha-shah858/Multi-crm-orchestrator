import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { updateCommission } from "@/lib/operations/sales-operations-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return withApiErrorHandling(request, async (requestId) => success({ commission: await updateCommission(await requireRequestContext(request), (await params).id, await request.json(), requestId) }, requestId)); }
