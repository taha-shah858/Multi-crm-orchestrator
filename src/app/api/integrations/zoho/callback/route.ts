import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { isAdminWorkspaceRole } from "@/lib/auth/roles";
import { isAppError } from "@/lib/errors/app-error";
import { completeZohoOAuth, recordZohoOAuthDenial } from "@/lib/integrations/integration-service";

export async function GET(request: NextRequest) {
  let fallbackPath = "/integrations";
  try {
    const user = await requireAuthenticatedUser(request);
    fallbackPath = isAdminWorkspaceRole(user.role) ? "/admin/integrations" : "/integrations";
    const state = request.nextUrl.searchParams.get("state") ?? "";
    const providerError = request.nextUrl.searchParams.get("error");
    if (providerError) {
      const returnPath = await recordZohoOAuthDenial(user, state);
      const destination = new URL(returnPath, request.url);
      destination.searchParams.set("integration", "denied");
      return NextResponse.redirect(destination);
    }
    const code = request.nextUrl.searchParams.get("code") ?? "";
    const accountsServer =
      request.nextUrl.searchParams.get("accounts-server") ||
      request.nextUrl.searchParams.get("accounts_server") ||
      undefined;
    const location = request.nextUrl.searchParams.get("location") || undefined;
    const callbackRedirectUri = `${request.nextUrl.origin}/api/integrations/zoho/callback`;

    const rawEnvUri = process.env.ZOHO_REDIRECT_URI?.trim().replace(/^"|"$/g, "");
    const result = await completeZohoOAuth(user, state, code, {
      accountsServer: accountsServer || (location ? `https://accounts.zoho.${location === "us" ? "com" : location}` : undefined),
      redirectUri: rawEnvUri || callbackRedirectUri,
    });
    const destination = new URL(result.returnPath, request.url);
    destination.searchParams.set("integration", "connected");
    destination.searchParams.set("provider", "zoho");
    return NextResponse.redirect(destination);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Zoho authorization could not be completed.";
    console.error("[Zoho OAuth Callback] Error:", rawMessage);
    const destination = new URL(fallbackPath, request.url);
    destination.searchParams.set("integration", "error");
    destination.searchParams.set(
      "message",
      isAppError(error) ? error.safeMessage : rawMessage,
    );
    return NextResponse.redirect(destination);
  }
}
