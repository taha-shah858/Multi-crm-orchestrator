import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { updateSalesScript } from "@/lib/scripts/sales-script-service";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return withApiErrorHandling(request, async (requestId) => success({ script: await updateSalesScript(await requireRequestContext(request), (await params).id, await request.json(), requestId) }, requestId)); }
