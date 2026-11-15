import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { createLeadAnalysis, listLeadAnalyses } from "@/lib/ai/lead-analysis-service";
import { streamJsonResponse } from "@/lib/http/stream-json";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ analyses: await listLeadAnalyses(await requireRequestContext(request)) }, requestId)); }
export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    // Authenticate before opening a stream; errors here retain normal HTTP status.
    const context = await requireRequestContext(request);
    const input = await request.json();
    const generate = () => withApiErrorHandling(request, async () => success({ analysis: await createLeadAnalysis(context, input, requestId) }, requestId, 201));
    return request.headers.get("x-copilot-stream") === "1" ? streamJsonResponse(generate) : generate();
  });
}
