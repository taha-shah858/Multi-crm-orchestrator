import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { isAppError } from "@/lib/errors/app-error";
import {
  completeClickUpOAuth,
  failClickUpOAuth,
} from "@/lib/integrations/integration-service";

export async function GET(request: NextRequest) {
  const fallbackPath = "/operations";
  try {
    const user = await requireAuthenticatedUser(request);
    const state = request.nextUrl.searchParams.get("state") ?? "";
    const providerError = request.nextUrl.searchParams.get("error");

    if (providerError) {
      const returnPath = await failClickUpOAuth(user, state);
      const destination = new URL(returnPath || fallbackPath, request.url);
      destination.searchParams.set("integration", "denied");
      destination.searchParams.set("provider", "clickup");
      return NextResponse.redirect(destination);
    }

    const code = request.nextUrl.searchParams.get("code") ?? "";
    const result = await completeClickUpOAuth(code, state, user);

    const destination = new URL(result.returnPath || fallbackPath, request.url);
    destination.searchParams.set("integration", "connected");
    destination.searchParams.set("provider", "clickup");
    return NextResponse.redirect(destination);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "ClickUp authorization could not be completed.";
    console.error("[ClickUp OAuth Callback] Error:", rawMessage);
    const destination = new URL(fallbackPath, request.url);
    destination.searchParams.set("integration", "error");
    destination.searchParams.set("provider", "clickup");
    destination.searchParams.set(
      "message",
      isAppError(error) ? error.safeMessage : rawMessage,
    );
    return NextResponse.redirect(destination);
  }
}
