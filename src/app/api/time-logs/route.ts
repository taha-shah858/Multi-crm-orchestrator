import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { createManualTimeLog, listTimeLogs } from "@/lib/operations/sales-operations-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ timeLogs: await listTimeLogs(requireRequestContext(request)) }, requestId)); }
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ timeLog: await createManualTimeLog(requireRequestContext(request), await request.json(), requestId) }, requestId, 201)); }
