import type { UserRole } from "@/lib/models/canonical";

export const ADMIN_WORKSPACE_ROLES: UserRole[] = ["ADMIN", "MANAGER"];
export type WorkspaceRole = "ADMIN" | "AGENT";

export function isAdminWorkspaceRole(role: UserRole) {
  return ADMIN_WORKSPACE_ROLES.includes(role);
}

export function workspaceHomeForRole(role: UserRole) {
  return isAdminWorkspaceRole(role) ? "/admin" : "/";
}

export function workspaceRoleForUserRole(role: UserRole): WorkspaceRole {
  return isAdminWorkspaceRole(role) ? "ADMIN" : "AGENT";
}

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === "ADMIN" || value === "AGENT";
}
