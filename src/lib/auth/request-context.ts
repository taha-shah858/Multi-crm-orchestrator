import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { assertClientAccess, findAuthenticatedUser } from "@/lib/auth/auth-service";
import type { RequestContext } from "@/lib/models/canonical";

export const SESSION_COOKIE = "multi_crm_session";
export const ACTIVE_CLIENT_ACCOUNT_COOKIE = "multi_crm_active_client";

/**
 * Resolves the persisted server session and validates both organization and
 * active-client access before domain services perform any query.
 */
export async function requireAuthenticatedUser(request: NextRequest) {
  const user = await findAuthenticatedUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    throw new AppError(
      "UNAUTHENTICATED",
      401,
      "Missing or invalid session cookie.",
      "Please sign in before continuing.",
    );
  }

  return user;
}

export async function requireRequestContext(request: NextRequest): Promise<RequestContext> {
  const user = await requireAuthenticatedUser(request);

  const activeClientAccountId = request.cookies.get(ACTIVE_CLIENT_ACCOUNT_COOKIE)?.value;
  if (!activeClientAccountId) {
    throw new AppError(
      "CLIENT_CONTEXT_REQUIRED",
      409,
      "No active client account was provided.",
      "Select a client account before performing this action.",
    );
  }

  await assertClientAccess(user, activeClientAccountId);
  return { user, activeClientAccountId };
}

export function requireRole(context: RequestContext, roles: Array<RequestContext["user"]["role"]>) {
  if (!roles.includes(context.user.role)) {
    throw new AppError("FORBIDDEN", 403, "This action requires elevated access.", "Ask an administrator or manager for access.");
  }
}
