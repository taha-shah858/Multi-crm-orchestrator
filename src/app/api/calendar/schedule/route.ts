import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { createAppointment } from "@/lib/calendar/calendar-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => success({ appointment: await createAppointment(requireRequestContext(request), await request.json(), requestId) }, requestId, 201));
}
