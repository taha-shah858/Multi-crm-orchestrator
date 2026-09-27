import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import {
  createDealHandoffFromAgencyDeal,
  listDealHandoffs,
} from "@/lib/handoff/handoff-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const clientAccountId = request.nextUrl.searchParams.get("clientAccountId") || undefined;
    const handoffs = await listDealHandoffs(context, { clientAccountId });
    return success({ handoffs }, requestId);
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const body = await request.json();
    const agencyDealId = typeof body.agencyDealId === "string" ? body.agencyDealId : "";
    const handoff = await createDealHandoffFromAgencyDeal(context, agencyDealId, {
      closeOutcome: body.closeOutcome,
      recommendedNextAction: body.recommendedNextAction,
      notes: body.notes,
    });
    return success({ handoff }, requestId, 201);
  });
}
