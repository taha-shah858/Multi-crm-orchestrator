import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { getAgentDashboard } from "@/lib/dashboard/agent-dashboard-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => success(await getAgentDashboard(await requireAuthenticatedUser(request)), requestId));
}
