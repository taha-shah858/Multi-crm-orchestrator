import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { updateLeadAnalysis } from "@/lib/ai/lead-analysis-service";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return withApiErrorHandling(request, async (requestId) => success({ analysis: await updateLeadAnalysis(requireRequestContext(request), (await params).id, await request.json(), requestId) }, requestId)); }
