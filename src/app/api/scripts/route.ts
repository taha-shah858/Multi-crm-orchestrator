import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { createManualSalesScript, listSalesScripts } from "@/lib/scripts/sales-script-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ scripts: await listSalesScripts(requireRequestContext(request)) }, requestId)); }
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ script: await createManualSalesScript(requireRequestContext(request), await request.json(), requestId) }, requestId, 201)); }
