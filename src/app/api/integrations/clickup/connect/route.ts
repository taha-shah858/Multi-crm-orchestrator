import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { beginClickUpOAuth, connectClickUp } from "@/lib/integrations/integration-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const returnPath = request.nextUrl.searchParams.get("returnPath") || "/operations";
    const result = await beginClickUpOAuth(user, returnPath);
    return NextResponse.redirect(result.authorizationUrl);
  } catch (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "auth_required");
    return NextResponse.redirect(loginUrl);
  }
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // Direct token connect (for automated testing / mock / dev)
    if (body.accessToken || body.refreshToken) {
      const result = await connectClickUp(user, {
        accessToken: (body.accessToken as string) || undefined,
        refreshToken: (body.refreshToken as string) || undefined,
        destination: body.destination as any,
      });
      return success(result, requestId, 201);
    }

    // Default: initiate OAuth flow
    const returnPath = typeof body.returnPath === "string" ? body.returnPath : "/operations";
    const result = await beginClickUpOAuth(user, returnPath);
    return success(result, requestId, 201);
  });
}
