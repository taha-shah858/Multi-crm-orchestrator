import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { disconnectClickUp } from "@/lib/integrations/integration-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const result = await disconnectClickUp(user);
    return success(result, requestId);
  });
}
