import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { isAdminWorkspaceRole } from "@/lib/auth/roles";
import { isAppError } from "@/lib/errors/app-error";
import { completeHubSpotOAuth, recordHubSpotOAuthDenial } from "@/lib/integrations/integration-service";

export async function GET(request: NextRequest) {
  let fallbackPath = "/integrations";
  try {
    const user = await requireAuthenticatedUser(request);
    fallbackPath = isAdminWorkspaceRole(user.role) ? "/admin/integrations" : "/integrations";
    const state = request.nextUrl.searchParams.get("state") ?? "";
    const providerError = request.nextUrl.searchParams.get("error");
    if (providerError) {
      const returnPath = await recordHubSpotOAuthDenial(user, state);
      const destination = new URL(returnPath, request.url);
      destination.searchParams.set("integration", "denied");
      return NextResponse.redirect(destination);
    }
    const code = request.nextUrl.searchParams.get("code") ?? "";
    const result = await completeHubSpotOAuth(user, state, code);
    const destination = new URL(result.returnPath, request.url);
    destination.searchParams.set("integration", "connected");
    return NextResponse.redirect(destination);
  } catch (error) {
    const destination = new URL(fallbackPath, request.url);
    destination.searchParams.set("integration", "error");
    destination.searchParams.set("message", isAppError(error) ? error.safeMessage : "HubSpot authorization could not be completed.");
    return NextResponse.redirect(destination);
  }
}
