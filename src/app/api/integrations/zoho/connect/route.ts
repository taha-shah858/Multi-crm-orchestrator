import type { NextRequest } from "next/server";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE, requireAuthenticatedUser } from "@/lib/auth/request-context";
import { isAdminWorkspaceRole } from "@/lib/auth/roles";
import { AppError } from "@/lib/errors/app-error";
import { beginZohoOAuth, connectZoho } from "@/lib/integrations/integration-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const activeClientAccountId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value ?? null;

    // Check if direct credentials were provided (for automated tests / manual token entry)
    if (body.accessToken || body.refreshToken || body.apiKey) {
      if (!isAdminWorkspaceRole(user.role)) {
        throw new AppError("FORBIDDEN", 403, "Direct credential connection requires an Admin role.", "Ask an Administrator to configure Zoho CRM.");
      }
      const result = await connectZoho(
        user,
        {
          clientAccountId: (body.clientAccountId as string) || undefined,
          clientId: (body.clientId as string) || undefined,
          clientSecret: (body.clientSecret as string) || undefined,
          accessToken: (body.accessToken as string) || undefined,
          refreshToken: (body.refreshToken as string) || undefined,
          apiDomain: (body.apiDomain as string) || undefined,
        },
        activeClientAccountId,
      );
      return success(result, requestId, 201);
    }

    // Default: initiate Zoho OAuth flow
    return success(await beginZohoOAuth(user, body, activeClientAccountId), requestId, 201);
  });
}
