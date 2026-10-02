import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { listCalendlyEventTypes } from "@/lib/calendar/calendar-sync-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { listManagedEventTypes, saveEventType } from "@/lib/calendar/calendly-event-types";
import { AppError } from "@/lib/errors/app-error";
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("manage") === "true") return withApiErrorHandling(request, async requestId => success({ eventTypes: await listManagedEventTypes(await requireRequestContext(request)) }, requestId));
  return withApiErrorHandling(request, async requestId => success(await listCalendlyEventTypes(await requireRequestContext(request)), requestId));
}
export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const context = await requireRequestContext(request);
    let input;
    try { input = await request.json(); } catch { throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid input.", "Send valid event-type details."); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid input.", "Send valid event-type details.");
    return success({ eventType: await saveEventType(context, input, requestId) }, requestId);
  });
}
