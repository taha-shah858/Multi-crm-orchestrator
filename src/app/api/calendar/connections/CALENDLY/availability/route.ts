import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { getEventTypeAvailability, saveEventTypeAvailability } from "@/lib/calendar/calendly-event-types";
import { AppError } from "@/lib/errors/app-error";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => success({ availability: await getEventTypeAvailability(await requireRequestContext(request), request.nextUrl.searchParams.get("uri") ?? "") }, requestId));
}
export async function PATCH(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const context = await requireRequestContext(request);
    let input;
    try { input = await request.json(); } catch { throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid input.", "Send valid availability details."); }
    if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.uri !== "string") throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid input.", "Choose an event type and its availability.");
    return success({ availability: await saveEventTypeAvailability(context, input.uri, input, requestId) }, requestId);
  });
}
