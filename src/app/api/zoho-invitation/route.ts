import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/http/api-response";
import { AppError } from "@/lib/errors/app-error";
import { assertSameOrigin, beginInvitedZohoOAuth, inspectZohoInvitation, invitationCookie } from "@/lib/integrations/zoho/connection-requests";

export async function POST(request: NextRequest) {
  const response = await withApiErrorHandling(request, async () => {
    assertSameOrigin(request);
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    if (body.action === "inspect") return NextResponse.json({ success: true, ...await inspectZohoInvitation(token) });
    if (body.action !== "authorize") throw new AppError("INVALID_REQUEST", 422, "Invalid action.", "Open a valid connection invitation.");
    const result = await beginInvitedZohoOAuth(token, typeof body.accountsUrl === "string" ? body.accountsUrl : undefined);
    const reply = NextResponse.json({ success: true, authorizationUrl: result.authorizationUrl });
    reply.cookies.set(invitationCookie(result.state), result.browser, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/integrations/zoho/callback", maxAge: 600 });
    return reply;
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
