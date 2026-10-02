import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { listCalendarConnections } from "@/lib/calendar/calendar-connections";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => success({ connections: await listCalendarConnections(await requireAuthenticatedUser(request)) }, requestId));
}
