import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { completeCalendarConnection } from "@/lib/calendar/calendar-connections";
import { calendarOAuthConfig } from "@/lib/calendar/calendar-oauth";
import { isRemoteCalendarProvider } from "@/lib/calendar/calendar-types";
import { AppError } from "@/lib/errors/app-error";
import { withApiErrorHandling } from "@/lib/http/api-response";
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  return withApiErrorHandling(request, async requestId => {
    const user = await requireAuthenticatedUser(request), { provider } = await params;
    if (!isRemoteCalendarProvider(provider)) throw new AppError("INVALID_INTEGRATION_TARGET", 422, "Invalid calendar provider.", "Choose Google, Outlook or Calendly.");
    const returnTo = new URL("/calendar", calendarOAuthConfig(provider).redirectUri);
    try {
      await completeCalendarConnection(user, provider, request.nextUrl.searchParams.get("state") ?? "", request.nextUrl.searchParams.get("code") ?? "", requestId);
      returnTo.searchParams.set("calendarConnected", provider);
    } catch {
      // Never echo provider errors, tokens or authorization codes into the URL.
      returnTo.searchParams.set("calendarError", "connection_failed");
    }
    return Response.redirect(returnTo, 303);
  });
}
