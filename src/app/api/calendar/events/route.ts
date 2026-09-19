import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { listCalendarWorkspace } from "@/lib/calendar/calendar-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => success(await listCalendarWorkspace(await requireRequestContext(request)), requestId));
}
