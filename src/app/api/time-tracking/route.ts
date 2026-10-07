import type { NextRequest } from "next/server";
import { requireAuthenticatedUser, requireRequestContext } from "@/lib/auth/request-context";
import { AppError } from "@/lib/errors/app-error";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { parseTrackingInput, trackActiveTime } from "@/lib/operations/time-tracking-service";
import { prisma } from "@/lib/db/prisma";
import { summarizeTime } from "@/lib/operations/time-tracking-policy";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const context = await requireRequestContext(request);
    if (context.user.role !== "AGENT") throw new AppError("FORBIDDEN", 403, "Agent access required.", "Time tracking is available in the agent workspace.");
    const groups = await prisma.timeLog.groupBy({ by: ["source", "isManualOverride"], where: { organizationId: context.user.organizationId, userId: context.user.id, clientAccountId: context.activeClientAccountId }, _sum: { minutes: true, trackedSeconds: true } });
    return success({ clientAccountId: context.activeClientAccountId, clientTotalSeconds: summarizeTime(groups).activeSeconds }, requestId);
  });
}
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
