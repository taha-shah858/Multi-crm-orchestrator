import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { updateAppointment } from "@/lib/calendar/calendar-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async (requestId) => success({ appointment: await updateAppointment(await requireRequestContext(request), (await params).id, await request.json(), requestId) }, requestId));
}
