import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { createSession, hashPassword, toAuthenticatedUser } from "@/lib/auth/auth-service";
import { generateCryptoToken, hashSha256, sendInviteEmail } from "@/lib/email/email-service";
import { acceptInviteSchema, inviteMemberSchema, formatZodError } from "@/lib/auth/validations";
import type { AuthenticatedUser } from "@/lib/models/canonical";
import type { UserRole } from "@prisma/client";

/**
 * Ensures the actor has Admin or Manager role.
 */
function requireAdminOrManager(actor: AuthenticatedUser) {
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    throw new AppError(
      "FORBIDDEN",
      403,
      "Administrative privileges are required to invite members.",
      "Ask an administrator or manager for access."
    );
  }
}

/**
 * Ensures the actor is strictly an Admin.
 */
function requireAdminOnly(actor: AuthenticatedUser) {
  if (actor.role !== "ADMIN") {
    throw new AppError(
      "FORBIDDEN",
      403,
      "Only company Administrators can revoke member access.",
      "Contact a company administrator."
    );
  }
}

/**
 * 1. Admin/Manager sends an email invite to a new member
 */
export async function inviteMember(
  actor: AuthenticatedUser,
  input: Record<string, unknown>,
  requestOrigin?: string
) {
  requireAdminOrManager(actor);

  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("INVALID_INVITATION", 422, formatZodError(parsed.error), "Provide a valid email and role.");
  }

  const { email, role } = parsed.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (existingUser) {
    throw new AppError(
      "EMAIL_IN_USE",
      409,
      `A user with email ${email} already exists in the system.`,
      "Use another email address or edit the existing user directly."
    );
  }

  // Generate secure 32-byte crypto token
  const token = generateCryptoToken(32);
  const tokenHash = hashSha256(token);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48-hour expiration

  // Upsert pending invitation for this email in this organization
  const invitation = await prisma.workspaceInvitation.upsert({
    where: { tokenHash },
    update: {
      email,
      role: role as UserRole,
      expiresAt,
      invitedBy: actor.id,
      organizationId: actor.organizationId,
    },
    create: {
      email,
      role: role as UserRole,
      tokenHash,
      expiresAt,
      invitedBy: actor.id,
      organizationId: actor.organizationId,
    },
  });

  // Fetch company organization name
  const organization = await prisma.organization.findUnique({
    where: { id: actor.organizationId },
    select: { name: true },
  });

  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || requestOrigin || "http://localhost:3000";
  const inviteUrl = `${baseUrl.replace(/\/$/, "")}/accept-invite?token=${token}`;

  // Dispatch email invitation
  await sendInviteEmail({
    email,
    inviteUrl,
    role,
    organizationName: organization?.name || "Multi-CRM Workspace",
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      organizationId: actor.organizationId,
      userId: actor.id,
      action: "USER_CREATED",
      entityType: "WORKSPACE_INVITATION",
      entityId: invitation.id,
      source: "PLATFORM",
      metadata: { email, role, inviteUrlGenerated: true },
    },
  });

  return {
    success: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    },
    message: `Invitation successfully dispatched to ${email}.`,
  };
}

/**
 * 2. Lookup invitation info by token for the Accept Invite screen
 */
export async function getInvitationDetails(token: string) {
  if (!token?.trim()) {
    throw new AppError("INVALID_TOKEN", 400, "Invitation token is required.", "Check your invitation link.");
  }

  const tokenHash = hashSha256(token.trim());
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { tokenHash },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    throw new AppError("INVITATION_NOT_FOUND", 404, "Invitation not found or invalid.", "Request a new invite from your administrator.");
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new AppError("INVITATION_EXPIRED", 410, "Invitation has expired.", "Invitations expire after 48 hours. Request a new invite.");
  }

  return {
    email: invitation.email,
    role: invitation.role,
    organizationName: invitation.organization.name,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * 3. Accept invite and create user account
 */
export async function acceptMemberInvite(input: Record<string, unknown>) {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("INVALID_INPUT", 422, formatZodError(parsed.error), "Fill in all fields matching enterprise requirements.");
  }

  const { token, name, password } = parsed.data;
  const tokenHash = hashSha256(token);

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { tokenHash },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    throw new AppError("INVITATION_NOT_FOUND", 404, "Invalid or non-existent invitation.", "Request a new invite from your administrator.");
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new AppError("INVITATION_EXPIRED", 410, "This invitation link has expired (48h limit).", "Request a new invite from your administrator.");
  }

  // Verify email not already registered
  const existing = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("EMAIL_IN_USE", 409, "A user with this email already exists.", "Sign in instead.");
  }

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    // Create new User
    const user = await tx.user.create({
      data: {
        organizationId: invitation.organizationId,
        name,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        status: "ACTIVE",
      },
    });

    // Automatically assign active client accounts if role is AGENT
    const clients = await tx.clientAccount.findMany({
      where: { organizationId: invitation.organizationId, status: "ACTIVE" },
      select: { id: true },
    });

    if (clients.length > 0) {
      await tx.clientAssignment.createMany({
        data: clients.map((client) => ({
          clientAccountId: client.id,
          userId: user.id,
        })),
        skipDuplicates: true,
      });
    }

    // Delete used invitation
    await tx.workspaceInvitation.delete({
      where: { id: invitation.id },
    });

    // Record audit log
    await tx.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        action: "USER_CREATED",
        entityType: "USER",
        entityId: user.id,
        source: "PLATFORM",
        metadata: { role: invitation.role, inviteAccepted: true },
      },
    });

    return { user, defaultClientId: clients[0]?.id };
  });

  const session = await createSession(result.user.id);
  return {
    user: toAuthenticatedUser(result.user),
    session,
    defaultClientAccountId: result.defaultClientId,
  };
}

/**
 * 4. Revoke / Remove member
 * Caller must be ADMIN.
 * Self-deletion is prevented.
 * Instantly invalidates all rows in AuthSession where userId = targetId.
 * Soft-deletes or removes user cleanly.
 */
export async function revokeMember(actor: AuthenticatedUser, targetUserId: string) {
  requireAdminOnly(actor);

  if (actor.id === targetUserId) {
    throw new AppError(
      "SELF_REVOCATION_PREVENTED",
      400,
      "Administrators cannot delete or revoke their own access.",
      "Another administrator must perform this action."
    );
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      organizationId: actor.organizationId,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!targetUser) {
    throw new AppError("USER_NOT_FOUND", 404, "Member not found in your organization.", "Verify member ID and try again.");
  }

  // 1. Instantly invalidate all active AuthSession rows for targetId
  await prisma.authSession.deleteMany({
    where: { userId: targetUserId },
  });

  // 2. Unassign contacts and clean client assignments
  await prisma.contact.updateMany({
    where: { assignedAgentId: targetUserId },
    data: { assignedAgentId: null },
  });
  await prisma.clientAssignment.deleteMany({
    where: { userId: targetUserId },
  });

  // 3. Attempt clean removal, falling back to soft-delete (SUSPENDED) if historical records exist
  let actionTaken = "DELETED";
  try {
    await prisma.user.delete({
      where: { id: targetUserId },
    });
  } catch {
    // Historical relational constraint (e.g. audits, deals) -> soft-delete
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: "SUSPENDED",
        passwordHash: null,
      },
    });
    actionTaken = "SUSPENDED";
  }

  // 4. Log audit action
  await prisma.auditLog.create({
    data: {
      organizationId: actor.organizationId,
      userId: actor.id,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: targetUserId,
      source: "PLATFORM",
      metadata: { action: "REVOKE_ACCESS", outcome: actionTaken, targetEmail: targetUser.email },
    },
  });

  return {
    success: true,
    action: actionTaken,
    message: `Member ${targetUser.name} (${targetUser.email}) access revoked and all active sessions terminated.`,
  };
}

/**
 * 5. Revoke a pending workspace invitation
 */
export async function revokeInvitation(actor: AuthenticatedUser, invitationId: string) {
  requireAdminOrManager(actor);

  const invitation = await prisma.workspaceInvitation.findFirst({
    where: {
      id: invitationId,
      organizationId: actor.organizationId,
    },
  });

  if (!invitation) {
    throw new AppError("INVITATION_NOT_FOUND", 404, "Invitation not found.", "It may have already been accepted or deleted.");
  }

  await prisma.workspaceInvitation.delete({
    where: { id: invitationId },
  });

  return {
    success: true,
    message: `Invitation to ${invitation.email} has been revoked.`,
  };
}

/**
 * 6. List all members and pending invitations for organization
 */
export async function listOrganizationMembers(actor: AuthenticatedUser) {
  requireAdminOrManager(actor);

  const [members, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: actor.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        clientAccess: {
          select: {
            clientAccount: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { commissionRecords: true, timeLogs: true, assignedLeads: true },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    }),
    prisma.workspaceInvitation.findMany({
      where: { organizationId: actor.organizationId },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    members,
    invitations: invitations.map((inv) => ({
      ...inv,
      isExpired: inv.expiresAt.getTime() < Date.now(),
    })),
  };
}
