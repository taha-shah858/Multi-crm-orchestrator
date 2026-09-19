import type { NextRequest } from "next/server";
import { createManagedClient, getAdminDashboard } from "@/lib/admin/admin-service";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const dashboard = await getAdminDashboard(await requireAuthenticatedUser(request));
    return success({ clients: dashboard.clients }, requestId);
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => success(
    { client: await createManagedClient(await requireAuthenticatedUser(request), await request.json()) },
    requestId,
    201,
  ));
}
