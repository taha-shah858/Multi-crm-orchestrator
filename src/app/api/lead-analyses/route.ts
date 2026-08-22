import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { createLeadAnalysis, listLeadAnalyses } from "@/lib/ai/lead-analysis-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ analyses: await listLeadAnalyses(requireRequestContext(request)) }, requestId)); }
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ analysis: await createLeadAnalysis(requireRequestContext(request), await request.json(), requestId) }, requestId, 201)); }
