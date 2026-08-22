import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { generateSalesScript } from "@/lib/scripts/sales-script-service";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ script: await generateSalesScript(requireRequestContext(request), await request.json(), requestId) }, requestId, 201)); }
