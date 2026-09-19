import { hashPassword } from "@/lib/auth/auth-service";
import { isAdminWorkspaceRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { AuthenticatedUser } from "@/lib/models/canonical";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const email = (value: unknown) => text(value).toLowerCase();

function requireElevated(user: AuthenticatedUser) {
  if (!isAdminWorkspaceRole(user.role)) {
    throw new AppError("FORBIDDEN", 403, "Admin workspace access is required.", "Admin workspace access is required.");
  }
}

function requireAdmin(user: AuthenticatedUser) {
  if (user.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", 403, "Only administrators can manage company access.", "Only administrators can manage company access.");
  }
}

export async function getAdminDashboard(user: AuthenticatedUser) {
  requireElevated(user);
  const organizationId = user.organizationId;
  const [clients, agents, commissions, timeLogs, audits, syncRuns] = await Promise.all([
    prisma.clientAccount.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        brandName: true,
        communicationIdentity: true,
        status: true,
        createdAt: true,
        crmConnections: { select: { id: true, provider: true, status: true, updatedAt: true }, orderBy: { provider: "asc" } },
        _count: { select: { contacts: true, agentAssignments: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        clientAccess: { select: { clientAccount: { select: { id: true, name: true } } } },
        _count: { select: { commissionRecords: true, timeLogs: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.commissionRecord.findMany({
      where: { organizationId },
      select: {
        id: true,
        expectedCents: true,
        receivedCents: true,
        status: true,
        updatedAt: true,
        clientAccount: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        deal: { select: { title: true, valueCents: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.timeLog.findMany({
      where: { organizationId },
      select: {
        id: true,
        minutes: true,
        description: true,
        loggedAt: true,
        clientAccount: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { loggedAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: { organizationId },
      select: {
        id: true,
        action: true,
        entityType: true,
        source: true,
        createdAt: true,
        clientAccount: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.syncRun.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        status: true,
        recordsRead: true,
        recordsCreated: true,
        recordsUpdated: true,
        recordsFailed: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        clientAccount: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    }),
  ]);

  const summary = commissions.reduce(
    (total, item) => ({
      expectedCents: total.expectedCents + item.expectedCents,
      receivedCents: total.receivedCents + item.receivedCents,
      dealValueCents: total.dealValueCents + (item.deal?.valueCents ?? 0),
    }),
    { expectedCents: 0, receivedCents: 0, dealValueCents: 0 },
  );
  const activeMinutes = timeLogs.reduce((total, item) => total + item.minutes, 0);

  return {
    clients,
    agents,
    commissions,
    timeLogs,
    audits,
    syncRuns,
    summary: {
      ...summary,
      pendingCents: Math.max(0, summary.expectedCents - summary.receivedCents),
      activeMinutes,
      activeAgents: agents.filter((agent) => agent.role === "AGENT" && agent.status === "ACTIVE").length,
    },
  };
}

export async function createManagedUser(actor: AuthenticatedUser, input: Record<string, unknown>) {
  requireAdmin(actor);
  const name = text(input.name);
  const userEmail = email(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role === "MANAGER" || input.role === "AGENT" ? input.role : null;
  const clientAccountIds = Array.isArray(input.clientAccountIds)
    ? input.clientAccountIds.filter((id): id is string => typeof id === "string")
    : [];
  if (!name || !userEmail || password.length < 10 || !role) {
    throw new AppError("INVALID_USER_INPUT", 422, "User details are invalid.", "Enter a name, email, role, and password of at least 10 characters.");
  }
  if (await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } })) {
    throw new AppError("EMAIL_IN_USE", 409, "Email is already registered.", "Choose another email address.");
  }
  const accessible = await prisma.clientAccount.findMany({
    where: { organizationId: actor.organizationId, id: { in: clientAccountIds } },
    select: { id: true },
  });
  if (accessible.length !== new Set(clientAccountIds).size) {
    throw new AppError("INVALID_CLIENT_ASSIGNMENT", 422, "One or more client accounts are invalid.", "Choose client accounts in your company.");
  }
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async (transaction) => {
    const created = await transaction.user.create({
      data: {
        organizationId: actor.organizationId,
        name,
        email: userEmail,
        passwordHash,
        role,
        status: "ACTIVE",
        clientAccess: { create: accessible.map((client) => ({ clientAccountId: client.id })) },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        clientAccess: { select: { clientAccount: { select: { id: true, name: true } } } },
      },
    });
    await transaction.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        userId: actor.id,
        action: "USER_CREATED",
        entityType: "USER",
        entityId: created.id,
        source: "PLATFORM",
        metadata: { role, assignedClientCount: accessible.length },
      },
    });
    return created;
  });
}

export async function updateManagedUser(actor: AuthenticatedUser, id: string, input: Record<string, unknown>) {
  requireAdmin(actor);
  const existing = await prisma.user.findFirst({ where: { id, organizationId: actor.organizationId }, select: { id: true, role: true } });
  if (!existing) throw new AppError("USER_NOT_FOUND", 404, "User was not found.", "Choose a user in your company.");

  const role = input.role === "ADMIN" || input.role === "MANAGER" || input.role === "AGENT" ? input.role : existing.role;
  const status = input.status === "ACTIVE" || input.status === "INVITED" || input.status === "SUSPENDED" ? input.status : undefined;
  const requestedAssignments = Array.isArray(input.clientAccountIds)
    ? input.clientAccountIds.filter((value): value is string => typeof value === "string")
    : null;
  const accounts = requestedAssignments
    ? await prisma.clientAccount.findMany({ where: { organizationId: actor.organizationId, id: { in: requestedAssignments } }, select: { id: true } })
    : [];
  if (requestedAssignments && accounts.length !== new Set(requestedAssignments).size) {
    throw new AppError("INVALID_CLIENT_ASSIGNMENT", 422, "One or more client accounts are invalid.", "Choose client accounts in your company.");
  }

  return prisma.$transaction(async (transaction) => {
    if (requestedAssignments) await transaction.clientAssignment.deleteMany({ where: { userId: id } });
    const updated = await transaction.user.update({
      where: { id },
      data: {
        role,
        ...(status ? { status } : {}),
        ...(requestedAssignments ? { clientAccess: { create: accounts.map((account) => ({ clientAccountId: account.id })) } } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        clientAccess: { select: { clientAccount: { select: { id: true, name: true } } } },
      },
    });
    await transaction.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        userId: actor.id,
        action: requestedAssignments ? "CLIENT_ASSIGNMENTS_UPDATED" : "USER_UPDATED",
        entityType: "USER",
        entityId: id,
        source: "PLATFORM",
        metadata: { role, status: status ?? null, assignedClientCount: requestedAssignments?.length ?? null },
      },
    });
    return updated;
  });
}

export async function createManagedClient(actor: AuthenticatedUser, input: Record<string, unknown>) {
  requireAdmin(actor);
  const name = text(input.name);
  const brandName = text(input.brandName) || name;
  const communicationIdentity = text(input.communicationIdentity) || null;
  if (name.length < 2 || brandName.length < 2) {
    throw new AppError("INVALID_CLIENT_ACCOUNT_INPUT", 422, "Client account details are invalid.", "Enter a client account and brand name.");
  }
  return prisma.$transaction(async (transaction) => {
    const client = await transaction.clientAccount.create({
      data: { organizationId: actor.organizationId, name, brandName, communicationIdentity, status: "ACTIVE" },
      select: { id: true, name: true, brandName: true, communicationIdentity: true, status: true },
    });
    await transaction.auditLog.create({
      data: { organizationId: actor.organizationId, userId: actor.id, clientAccountId: client.id, action: "CLIENT_ACCOUNT_CREATED", entityType: "CLIENT_ACCOUNT", entityId: client.id, source: "PLATFORM" },
    });
    return client;
  });
}

export async function updateManagedClient(actor: AuthenticatedUser, id: string, input: Record<string, unknown>) {
  requireAdmin(actor);
  const existing = await prisma.clientAccount.findFirst({ where: { id, organizationId: actor.organizationId }, select: { id: true } });
  if (!existing) throw new AppError("CLIENT_ACCOUNT_NOT_FOUND", 404, "Client account was not found.", "Choose a client account in your company.");
  const name = input.name === undefined ? undefined : text(input.name);
  const brandName = input.brandName === undefined ? undefined : text(input.brandName);
  const communicationIdentity = input.communicationIdentity === undefined ? undefined : text(input.communicationIdentity) || null;
  const status = input.status === "ACTIVE" || input.status === "INACTIVE" || input.status === "ARCHIVED" ? input.status : undefined;
  if (name === "" || brandName === "") {
    throw new AppError("INVALID_CLIENT_ACCOUNT_INPUT", 422, "Client account details are invalid.", "Names cannot be empty.");
  }
  return prisma.$transaction(async (transaction) => {
    const client = await transaction.clientAccount.update({
      where: { id },
      data: { ...(name !== undefined ? { name } : {}), ...(brandName !== undefined ? { brandName } : {}), ...(communicationIdentity !== undefined ? { communicationIdentity } : {}), ...(status ? { status } : {}) },
      select: { id: true, name: true, brandName: true, communicationIdentity: true, status: true },
    });
    await transaction.auditLog.create({
      data: { organizationId: actor.organizationId, userId: actor.id, clientAccountId: client.id, action: "CLIENT_ACCOUNT_UPDATED", entityType: "CLIENT_ACCOUNT", entityId: client.id, source: "PLATFORM", metadata: { status: status ?? null } },
    });
    return client;
  });
}
