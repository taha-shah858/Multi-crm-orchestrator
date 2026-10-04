import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { syncClientCrm } from "@/lib/client-crm/client-crm-service";
import { AppError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const input = request.body ? await request.json() : {};
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new AppError("INVALID_INTEGRATION_TARGET", 422, "Sync input must be an object.", "Provide a valid client CRM sync request.");
    }
    if (input.clientAccountId && input.clientAccountId !== context.activeClientAccountId) {
      throw new AppError("CLIENT_ACCESS_DENIED", 403, "Requested sync client differs from the selected client.", "Switch to the requested client before syncing its CRM.");
    }
    const provider = input.provider ?? "ZOHO";
    if (provider !== "ZOHO") {
      throw new AppError("CRM_PROVIDER_UNAVAILABLE", 422, "Current client CRM sync requires Zoho.", "Connect Zoho for the selected client before syncing.");
    }
    const result = await syncClientCrm(context, provider);
    return success(result, requestId);
  });
}
