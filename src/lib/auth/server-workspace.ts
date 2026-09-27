import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findAuthenticatedUser } from "@/lib/auth/auth-service";
import { isAdminWorkspaceRole, workspaceHomeForRole } from "@/lib/auth/roles";
import { SESSION_COOKIE } from "@/lib/auth/request-context";

export async function getPageUser() {
  const cookieStore = await cookies();
  return findAuthenticatedUser(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireAgentWorkspaceUser() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminWorkspaceUser() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (!isAdminWorkspaceRole(user.role)) redirect(workspaceHomeForRole(user.role));
  return user;
}
