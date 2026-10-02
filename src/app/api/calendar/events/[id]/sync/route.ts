import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { syncCalendarAppointment } from "@/lib/calendar/calendar-sync-service";
import { AppError } from "@/lib/errors/app-error";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async requestId => {
    const context = await requireRequestContext(request), { id } = await params;
    let input;
    try { input = await request.json(); }
    catch { throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid sync input.", "Send a valid JSON sync request."); }
    if (!input || (input.mode !== "PUSH" && input.mode !== "PULL")) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid sync mode.", "Choose retry or refresh from calendar.");
    return success({ appointment: await syncCalendarAppointment(context, id, requestId, input.mode) }, requestId);
  });
}
