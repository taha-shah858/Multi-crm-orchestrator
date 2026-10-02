import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { listCalendlyEventTypes } from "@/lib/calendar/calendar-sync-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => success(await listCalendlyEventTypes(await requireRequestContext(request)), requestId));
}
