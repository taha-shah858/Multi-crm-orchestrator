import type { NextRequest } from "next/server";
import { updateManagedClient } from "@/lib/admin/admin-service";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(request, async (requestId) => success(
    { client: await updateManagedClient(await requireAuthenticatedUser(request), (await params).id, await request.json()) },
    requestId,
  ));
}
