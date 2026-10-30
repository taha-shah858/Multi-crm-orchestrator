import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { isAdminWorkspaceRole } from "@/lib/auth/roles";
import { isAppError } from "@/lib/errors/app-error";
import { completeZohoOAuth, recordZohoOAuthDenial } from "@/lib/integrations/integration-service";
import { appOrigin, invitationCookie, stageZohoConsent } from "@/lib/integrations/zoho/connection-requests";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") || "";
  const invited = /^zi_[A-Za-z0-9_-]{43}$/.test(state);
  let fallbackPath = invited ? "/connect-zoho" : "/integrations";
  let response: NextResponse;
  try {
    const options = { accountsServer: request.nextUrl.searchParams.get("accounts-server") || request.nextUrl.searchParams.get("accounts_server") || undefined };
    const code = request.nextUrl.searchParams.get("code") || "";
    const denied = request.nextUrl.searchParams.has("error");
    if (invited) {
      await stageZohoConsent(state, code, { ...options, browser: request.cookies.get(invitationCookie(state))?.value, denied });
      response = NextResponse.redirect(new URL("/connect-zoho?result=review", appOrigin()));
    } else {
      // Ordinary OAuth remains authenticated and bound to its initiating user.
      const user = await requireAuthenticatedUser(request);
      fallbackPath = isAdminWorkspaceRole(user.role) ? "/admin/integrations" : "/integrations";
      if (denied) {
        await recordZohoOAuthDenial(user, state);
        response = NextResponse.redirect(new URL(`${fallbackPath}?integration=denied&provider=zoho`, appOrigin()));
      } else {
        const result = await completeZohoOAuth(user, state, code, options);
        response = NextResponse.redirect(new URL(`${result.returnPath}?integration=review&provider=zoho`, appOrigin()));
      }
    }
  } catch (error) {
    const destination = new URL(fallbackPath, appOrigin());
    if (invited) destination.searchParams.set("result", "failed");
    else {
      destination.searchParams.set("integration", "error");
      destination.searchParams.set("provider", "zoho");
      destination.searchParams.set("message", isAppError(error) ? error.safeMessage : "Zoho authorization could not be verified. No connection was changed.");
    }
    response = NextResponse.redirect(destination);
  }
  if (invited) response.cookies.set(invitationCookie(state), "", { path: "/api/integrations/zoho/callback", maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
