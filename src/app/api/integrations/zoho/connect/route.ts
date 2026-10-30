import type { NextRequest } from "next/server";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, requireAuthenticatedUser } from "@/lib/auth/request-context";
import { AppError } from "@/lib/errors/app-error";
import { beginZohoOAuth } from "@/lib/integrations/integration-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const activeClientAccountId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value ?? null;

    if (body.accessToken || body.refreshToken || body.apiKey) {
      throw new AppError("INVALID_REQUEST", 422, "Direct credentials cannot bypass organization review.", "Use Zoho OAuth or create a client invitation so its organization can be verified and approved.");
    }

    // Default: initiate Zoho OAuth flow
    return success(await beginZohoOAuth(user, body, activeClientAccountId), requestId, 201);
  });
}
