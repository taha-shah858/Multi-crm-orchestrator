import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { disconnectCalendar } from "@/lib/calendar/calendar-connections";
import { isRemoteCalendarProvider } from "@/lib/calendar/calendar-types";
import { AppError } from "@/lib/errors/app-error";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  return withApiErrorHandling(request, async requestId => {
    const user = await requireAuthenticatedUser(request), { provider } = await params;
    if (!isRemoteCalendarProvider(provider)) throw new AppError("INVALID_INTEGRATION_TARGET", 422, "Invalid calendar provider.", "Choose Google, Outlook or Calendly.");
    await disconnectCalendar(user, provider, requestId);
    return success({}, requestId);
  });
}
