import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { AppError } from "@/lib/errors/app-error";
import {
  createDealHandoffFromAgencyDeal,
  listDealHandoffs,
} from "@/lib/handoff/handoff-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const clientAccountId = request.nextUrl.searchParams.get("clientAccountId") || undefined;
    const handoffs = await listDealHandoffs(context, { clientAccountId, clientCrmProvider: "ZOHO" });
    return success({ handoffs }, requestId);
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AppError("INVALID_DEAL_INPUT", 422, "Handoff input must be an object.", "Provide a valid deal handoff request.");
    }
    if (body.clientCrmProvider !== undefined && body.clientCrmProvider !== "ZOHO") {
      throw new AppError("CRM_PROVIDER_UNAVAILABLE", 422, "New client CRM handoffs require Zoho.", "Connect Zoho for the selected client before handing off a deal.");
    }
    const agencyDealId = typeof body.agencyDealId === "string" ? body.agencyDealId : "";
    const handoff = await createDealHandoffFromAgencyDeal(context, agencyDealId, {
      clientCrmProvider: "ZOHO",
      closeOutcome: body.closeOutcome,
      recommendedNextAction: body.recommendedNextAction,
      notes: body.notes,
    });
    return success({ handoff }, requestId, 201);
  });
}
