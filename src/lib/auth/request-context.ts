import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";

export const SESSION_COOKIE = "multi_crm_session";
export const ACTIVE_CLIENT_ACCOUNT_COOKIE = "multi_crm_active_client";

/**
 * The current UI still creates a presentation-only session cookie. During local
 * development this preserves the existing workflow while giving server routes a
 * single request-context boundary. Production rejects this bootstrap identity
 * until database-backed login is introduced.
 */
export function requireRequestContext(request: NextRequest): RequestContext {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session !== "active") {
    throw new AppError(
      "UNAUTHENTICATED",
      401,
      "Missing or invalid session cookie.",
      "Please sign in before continuing.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      "UNAUTHENTICATED",
      401,
      "Bootstrap sessions are disabled in production.",
      "A server-backed session is required in this environment.",
    );
  }

  const activeClientAccountId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value;
  if (!activeClientAccountId) {
    throw new AppError(
      "CLIENT_CONTEXT_REQUIRED",
      409,
      "No active client account was provided.",
      "Select a client account before performing this action.",
    );
  }

  return {
    user: {
      id: "dev-agent-operator",
      organizationId: "dev-company-zenith",
      name: "Operator",
      email: "operator@zenith.core",
      role: "AGENT",
    },
    activeClientAccountId,
  };
}
