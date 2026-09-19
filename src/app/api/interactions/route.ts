import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { createManualInteraction, listInteractions } from "@/lib/interactions/interaction-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ interactions: await listInteractions(await requireRequestContext(request)) }, requestId)); }
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ interaction: await createManualInteraction(await requireRequestContext(request), await request.json(), requestId) }, requestId, 201)); }
