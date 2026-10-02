import type { NextRequest } from "next/server";
import { requireAuthenticatedUser, requireRequestContext } from "@/lib/auth/request-context";
import { AppError } from "@/lib/errors/app-error";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { parseTrackingInput, trackActiveTime } from "@/lib/operations/time-tracking-service";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid tracking request.", "Reload the workspace to restart time tracking."); }
    const input = parseTrackingInput(body);
    if (input.action === "HEARTBEAT") {
      const context = await requireRequestContext(request);
      if (input.clientAccountId !== context.activeClientAccountId) throw new AppError("CLIENT_CONTEXT_REQUIRED", 409, "Selected client changed.", "Time tracking paused because the selected client changed. Reload this tab.");
    }
    // Pausing uses the authenticated agent's cursor, allowing an old client to
    // finish while the selection cookie is already switching to another client.
    return success({ tracking: await trackActiveTime(user, input, requestId) }, requestId);
  });
}
