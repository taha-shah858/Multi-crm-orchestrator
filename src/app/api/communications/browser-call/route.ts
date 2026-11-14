import type { NextRequest } from "next/server";
import { requireAuthenticatedUser, requireRequestContext, SESSION_COOKIE } from "@/lib/auth/request-context";
import { success, withApiErrorHandling } from "@/lib/http/api-response";
import { prepareBrowserCall, cancelPreparedBrowserCall } from "@/lib/communications/browser-call-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const context = await requireRequestContext(request);
    const result = await prepareBrowserCall(context, await request.json(), request.cookies.get(SESSION_COOKIE)!.value, requestId);
    const response = success(result, requestId, 201);
    response.headers.set("Cache-Control", "no-store");
    return response;
  });
}

export async function DELETE(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const user = await requireAuthenticatedUser(request);
    const input = await request.json();
    if (typeof input.interactionId === "string") await cancelPreparedBrowserCall(user, input.interactionId);
    return success({}, requestId);
  });
}
