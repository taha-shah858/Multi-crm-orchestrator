import type { NextRequest } from "next/server";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { scriptTemplates } from "@/lib/scripts/sales-script-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ templates: scriptTemplates }, requestId)); }
