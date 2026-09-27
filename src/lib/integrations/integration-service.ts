import "server-only";

import { createHash, randomBytes } from "crypto";
import type { AuditAction, IntegrationConnection, IntegrationOwnershipType } from "@prisma/client";
import { isAdminWorkspaceRole } from "@/lib/auth/roles";
import { assertClientAccess } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { isSyncableConnectionStatus } from "@/lib/integrations/connection-resolution";
import {
  buildHubSpotAuthorizationUrl,
  encryptedHubSpotCredentialData,
  exchangeHubSpotAuthorizationCode,
  HUBSPOT_CONTACT_SCOPES,
  revokeHubSpotCredential,
} from "@/lib/integrations/hubspot/oauth";
import {
  buildZohoAuthorizationUrl,
  encryptedZohoCredentialData,
  exchangeZohoAuthorizationCode,
  ZOHO_SCOPES,
} from "@/lib/integrations/zoho/oauth";
import { syncSingleConnectionContacts } from "@/lib/sync/contact-sync-service";
import type { AuthenticatedUser, IntegrationConnectionSummary, RequestContext } from "@/lib/models/canonical";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const hashState = (state: string) => createHash("sha256").update(state).digest("hex");
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function ownershipKey(organizationId: string, ownershipType: IntegrationOwnershipType, clientAccountId: string | null, userId: string | null) {
  if (ownershipType === "COMPANY") return `company:${organizationId}`;
  if (ownershipType === "CLIENT_ACCOUNT" && clientAccountId) return `client:${clientAccountId}`;
  if (ownershipType === "USER" && userId) return `user:${userId}`;
  throw new AppError("INVALID_INTEGRATION_TARGET", 422, "Integration ownership target is incomplete.", "Choose a valid integration owner.");
}

async function resolveOwnershipTarget(user: AuthenticatedUser, input: Record<string, unknown>, activeClientAccountId?: string | null) {
  const ownershipType = input.ownershipType === "COMPANY" || input.ownershipType === "USER"
    ? input.ownershipType
    : "CLIENT_ACCOUNT";

  if (ownershipType === "COMPANY") {
    if (!isAdminWorkspaceRole(user.role)) throw new AppError("FORBIDDEN", 403, "Company integration management requires an elevated role.", "An Admin or Manager must connect company integrations.");
    return { ownershipType, clientAccountId: null, userId: null, returnPath: "/admin/integrations" } as const;
  }

  if (ownershipType === "USER") {
    return { ownershipType, clientAccountId: null, userId: user.id, returnPath: isAdminWorkspaceRole(user.role) ? "/admin/integrations" : "/integrations" } as const;
  }

  const requestedClientId = isAdminWorkspaceRole(user.role) ? text(input.clientAccountId) : activeClientAccountId;
  if (!requestedClientId) throw new AppError("CLIENT_CONTEXT_REQUIRED", 409, "A client integration target is required.", "Select a client account before connecting HubSpot.");
  await assertClientAccess(user, requestedClientId);
  const client = await prisma.clientAccount.findFirst({
    where: { id: requestedClientId, organizationId: user.organizationId, status: "ACTIVE" },
    select: { id: true, allowAgentIntegrationManagement: true },
  });
  if (!client) throw new AppError("CLIENT_ACCESS_DENIED", 403, "Client integration target is unavailable.", "Choose an active client account you can access.");
  if (user.role === "AGENT" && !client.allowAgentIntegrationManagement) {
    throw new AppError("FORBIDDEN", 403, "Agent integration onboarding is disabled for this client.", "Ask an Admin or Manager to connect HubSpot for this client account.");
  }
  return { ownershipType, clientAccountId: client.id, userId: null, returnPath: isAdminWorkspaceRole(user.role) ? "/admin/integrations" : "/integrations" } as const;
}

function permissionsFor(user: AuthenticatedUser, connection: IntegrationConnection, allowAgentManagement = false) {
  const elevated = isAdminWorkspaceRole(user.role);
  const ownUserConnection = connection.ownershipType === "USER" && connection.userId === user.id;
  const assignedClientConnection = connection.ownershipType === "CLIENT_ACCOUNT" && Boolean(connection.clientAccountId);
  return {
    canConnect: elevated || ownUserConnection || (user.role === "AGENT" && assignedClientConnection && allowAgentManagement),
    canDisconnect: elevated || ownUserConnection,
    canSync: elevated || assignedClientConnection || ownUserConnection,
    canRetry: elevated || assignedClientConnection || ownUserConnection,
    canManage: elevated || ownUserConnection,
  };
}

export async function listIntegrationConnections(user: AuthenticatedUser, activeClientAccountId?: string | null): Promise<IntegrationConnectionSummary[]> {
  let where;
  if (isAdminWorkspaceRole(user.role)) {
    where = { organizationId: user.organizationId };
  } else {
    if (!activeClientAccountId) throw new AppError("CLIENT_CONTEXT_REQUIRED", 409, "No active client account is selected.", "Select a client account.");
    await assertClientAccess(user, activeClientAccountId);
    where = {
      organizationId: user.organizationId,
      OR: [
        { ownershipType: "COMPANY" as const },
        { ownershipType: "CLIENT_ACCOUNT" as const, clientAccountId: activeClientAccountId },
        { ownershipType: "USER" as const, userId: user.id },
      ],
    };
  }

  const connections = await prisma.integrationConnection.findMany({
    where,
    include: {
      clientAccount: { select: { id: true, name: true, allowAgentIntegrationManagement: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ ownershipType: "asc" }, { provider: "asc" }],
  });
  return connections.map((connection) => ({
    id: connection.id,
    organizationId: connection.organizationId,
    ownershipType: connection.ownershipType,
    clientAccountId: connection.clientAccountId,
    userId: connection.userId,
    provider: connection.provider,
    providerAccountId: connection.providerAccountId,
    providerAccountName: connection.providerAccountName,
    status: connection.status,
    scopes: connection.scopes,
    connectedAt: connection.connectedAt?.toISOString() ?? null,
    lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
    lastError: connection.lastError,
    clientAccount: connection.clientAccount ? { id: connection.clientAccount.id, name: connection.clientAccount.name } : null,
    owner: connection.owner,
    permissions: permissionsFor(user, connection, connection.clientAccount?.allowAgentIntegrationManagement ?? false),
  }));
}

export async function getIntegrationConnectPermissions(user: AuthenticatedUser, activeClientAccountId?: string | null) {
  const elevated = isAdminWorkspaceRole(user.role);
  if (elevated) return { canConnectCompany: true, canConnectClient: true, canConnectUser: true };
  if (!activeClientAccountId) return { canConnectCompany: false, canConnectClient: false, canConnectUser: true };
  await assertClientAccess(user, activeClientAccountId);
  const client = await prisma.clientAccount.findFirst({
    where: { id: activeClientAccountId, organizationId: user.organizationId, status: "ACTIVE" },
    select: { allowAgentIntegrationManagement: true },
  });
  return { canConnectCompany: false, canConnectClient: Boolean(client?.allowAgentIntegrationManagement), canConnectUser: true };
}

export async function beginHubSpotOAuth(user: AuthenticatedUser, input: Record<string, unknown>, activeClientAccountId?: string | null) {
  const target = await resolveOwnershipTarget(user, input, activeClientAccountId);
  const state = randomBytes(32).toString("base64url");
  const authorizationUrl = buildHubSpotAuthorizationUrl(state);
  await prisma.$transaction([
    prisma.oAuthState.deleteMany({ where: { organizationId: user.organizationId, expiresAt: { lt: new Date() } } }),
    prisma.oAuthState.create({
      data: {
        stateHash: hashState(state),
        provider: "HUBSPOT",
        organizationId: user.organizationId,
        ownershipType: target.ownershipType,
        clientAccountId: target.clientAccountId,
        userId: target.userId,
        initiatedByUserId: user.id,
        returnPath: target.returnPath,
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
      },
    }),
  ]);
  return { authorizationUrl };
}

export async function completeHubSpotOAuth(user: AuthenticatedUser, state: string, code: string) {
  const stored = await prisma.oAuthState.findUnique({ where: { stateHash: hashState(state) } });
  if (!stored || stored.provider !== "HUBSPOT" || stored.initiatedByUserId !== user.id || stored.organizationId !== user.organizationId) {
    throw new AppError("INVALID_OAUTH_STATE", 400, "OAuth state did not match the current session.", "This HubSpot connection request is invalid. Start again.");
  }
  if (stored.usedAt || stored.expiresAt <= new Date()) {
    throw new AppError("INVALID_OAUTH_STATE", 400, "OAuth state is expired or already used.", "This HubSpot connection request expired. Start again.");
  }
  await resolveOwnershipTarget(
    user,
    { ownershipType: stored.ownershipType, clientAccountId: stored.clientAccountId ?? undefined },
    stored.clientAccountId,
  );
  const consumed = await prisma.oAuthState.updateMany({ where: { id: stored.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  if (consumed.count !== 1) throw new AppError("INVALID_OAUTH_STATE", 400, "OAuth state could not be consumed.", "This HubSpot connection request is no longer valid.");

  try {
    const tokens = await exchangeHubSpotAuthorizationCode(code);
    const key = ownershipKey(stored.organizationId, stored.ownershipType, stored.clientAccountId, stored.userId);
    const scopes = tokens.scopes?.length ? tokens.scopes : [...HUBSPOT_CONTACT_SCOPES];
    const connection = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.integrationConnection.upsert({
        where: { ownershipKey_provider: { ownershipKey: key, provider: "HUBSPOT" } },
        update: {
          organizationId: stored.organizationId,
          ownershipType: stored.ownershipType,
          clientAccountId: stored.clientAccountId,
          userId: stored.userId,
          providerAccountId: tokens.hub_id ? String(tokens.hub_id) : null,
          providerAccountName: tokens.hub_id ? `HubSpot account ${tokens.hub_id}` : "Connected HubSpot account",
          status: "CONNECTED",
          scopes,
          connectedByUserId: user.id,
          connectedAt: new Date(),
          lastError: null,
        },
        create: {
          organizationId: stored.organizationId,
          ownershipType: stored.ownershipType,
          ownershipKey: key,
          clientAccountId: stored.clientAccountId,
          userId: stored.userId,
          provider: "HUBSPOT",
          providerAccountId: tokens.hub_id ? String(tokens.hub_id) : null,
          providerAccountName: tokens.hub_id ? `HubSpot account ${tokens.hub_id}` : "Connected HubSpot account",
          status: "CONNECTED",
          scopes,
          connectedByUserId: user.id,
          connectedAt: new Date(),
        },
      });
      await transaction.integrationCredential.upsert({
        where: { integrationConnectionId: saved.id },
        update: encryptedHubSpotCredentialData(tokens),
        create: { integrationConnectionId: saved.id, ...encryptedHubSpotCredentialData(tokens) },
      });
      await transaction.auditLog.create({
        data: {
          organizationId: stored.organizationId,
          clientAccountId: stored.clientAccountId,
          userId: user.id,
          action: "INTEGRATION_CONNECTED",
          entityType: "INTEGRATION_CONNECTION",
          entityId: saved.id,
          source: "HUBSPOT",
          metadata: { provider: "HUBSPOT", ownershipType: stored.ownershipType, providerAccountId: tokens.hub_id ? String(tokens.hub_id) : null },
        },
      });
      return saved;
    });
    return { connection, returnPath: stored.returnPath };
  } catch (error) {
    await prisma.auditLog.create({
      data: { organizationId: stored.organizationId, clientAccountId: stored.clientAccountId, userId: user.id, action: "INTEGRATION_OAUTH_FAILED", entityType: "INTEGRATION_CONNECTION", source: "HUBSPOT", metadata: { provider: "HUBSPOT", ownershipType: stored.ownershipType } },
    });
    throw error;
  }
}

export async function recordHubSpotOAuthDenial(user: AuthenticatedUser, state: string) {
  const stored = await prisma.oAuthState.findUnique({ where: { stateHash: hashState(state) } });
  if (!stored || stored.provider !== "HUBSPOT" || stored.initiatedByUserId !== user.id || stored.organizationId !== user.organizationId) {
    throw new AppError("INVALID_OAUTH_STATE", 400, "OAuth state did not match the current session.", "This HubSpot connection request is invalid. Start again.");
  }
  const consumed = await prisma.oAuthState.updateMany({ where: { id: stored.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  if (consumed.count !== 1) throw new AppError("INVALID_OAUTH_STATE", 400, "OAuth state is expired or already used.", "This HubSpot connection request expired. Start again.");
  await prisma.auditLog.create({
    data: {
      organizationId: stored.organizationId,
      clientAccountId: stored.clientAccountId,
      userId: user.id,
      action: "INTEGRATION_OAUTH_FAILED",
      entityType: "INTEGRATION_CONNECTION",
      source: "HUBSPOT",
      metadata: { provider: "HUBSPOT", ownershipType: stored.ownershipType, reason: "authorization_denied" },
    },
  });
  return stored.returnPath;
}

async function getAuthorizedConnection(user: AuthenticatedUser, id: string, activeClientAccountId?: string | null) {
  const connection = await prisma.integrationConnection.findFirst({ where: { id, organizationId: user.organizationId }, include: { clientAccount: { select: { allowAgentIntegrationManagement: true } } } });
  if (!connection) throw new AppError("INTEGRATION_NOT_FOUND", 404, "Integration connection was not found.", "Choose an integration in your workspace.");
  if (connection.ownershipType === "CLIENT_ACCOUNT" && connection.clientAccountId) {
    await assertClientAccess(user, connection.clientAccountId);
    if (user.role === "AGENT" && activeClientAccountId !== connection.clientAccountId) {
      throw new AppError("CLIENT_ACCESS_DENIED", 403, "Integration is outside the active client account.", "Switch to the integration's assigned client account.");
    }
  }
  if (connection.ownershipType === "USER" && connection.userId !== user.id && !isAdminWorkspaceRole(user.role)) {
    throw new AppError("FORBIDDEN", 403, "User integration belongs to another user.", "You cannot access another user's integration.");
  }
  return connection;
}

export async function disconnectIntegration(user: AuthenticatedUser, id: string, activeClientAccountId?: string | null) {
  const connection = await getAuthorizedConnection(user, id, activeClientAccountId);
  const ownUserConnection = connection.ownershipType === "USER" && connection.userId === user.id;
  if (!isAdminWorkspaceRole(user.role) && !ownUserConnection) throw new AppError("FORBIDDEN", 403, "Integration disconnect is not permitted.", "An Admin or Manager must disconnect this integration.");
  if (connection.provider === "HUBSPOT") await revokeHubSpotCredential(connection.id);
  await prisma.$transaction([
    prisma.integrationCredential.deleteMany({ where: { integrationConnectionId: connection.id } }),
    prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: "DISCONNECTED", connectedAt: null, lastError: null } }),
    prisma.auditLog.create({ data: { organizationId: user.organizationId, clientAccountId: connection.clientAccountId, userId: user.id, action: "INTEGRATION_DISCONNECTED", entityType: "INTEGRATION_CONNECTION", entityId: connection.id, source: connection.provider, metadata: { provider: connection.provider, ownershipType: connection.ownershipType } } }),
  ]);
}

export async function runIntegrationSync(user: AuthenticatedUser, id: string, requestId: string, activeClientAccountId?: string | null, retry = false) {
  const connection = await getAuthorizedConnection(user, id, activeClientAccountId);
  if (connection.ownershipType === "USER") {
    throw new AppError("INVALID_INTEGRATION_TARGET", 422, "User integrations cannot be synchronized directly.", "Choose an agency or client CRM integration.");
  }
  if (!isSyncableConnectionStatus(connection.status)) {
    const safeMessage = connection.status === "AUTHENTICATION_REQUIRED"
      ? "HubSpot authorization needs attention. Reconnect this account once to restore access."
      : "This integration is disconnected. Connect it before syncing.";
    throw new AppError("SYNC_CONNECTION_NOT_FOUND", 409, "Integration is not available for synchronization.", safeMessage);
  }
  const resolvedClientAccountId = connection.clientAccountId || activeClientAccountId || "";
  const context: RequestContext = { user, activeClientAccountId: resolvedClientAccountId };
  if (retry) {
    await prisma.auditLog.create({ data: { organizationId: user.organizationId, clientAccountId: connection.clientAccountId, userId: user.id, action: "INTEGRATION_SYNC_RETRIED", entityType: "INTEGRATION_CONNECTION", entityId: connection.id, source: "PLATFORM", requestId, metadata: { provider: connection.provider } } });
  }
  return syncSingleConnectionContacts(context, connection, requestId);
}

export async function connectActiveCampaign(
  user: AuthenticatedUser,
  input: { clientAccountId?: string; apiKey: string; apiUrl?: string },
  activeClientAccountId?: string | null,
) {
  const clientId = input.clientAccountId || activeClientAccountId;
  if (!clientId) {
    throw new AppError("CLIENT_CONTEXT_REQUIRED", 409, "A client integration target is required.", "Select a client account to connect ActiveCampaign.");
  }
  await assertClientAccess(user, clientId);

  const key = ownershipKey(user.organizationId, "CLIENT_ACCOUNT", clientId, null);
  const { encryptIntegrationSecret } = await import("@/lib/integrations/credential-crypto");

  const connection = await prisma.$transaction(async (tx) => {
    const conn = await tx.integrationConnection.upsert({
      where: { ownershipKey_provider: { ownershipKey: key, provider: "ACTIVECAMPAIGN" } },
      update: {
        organizationId: user.organizationId,
        ownershipType: "CLIENT_ACCOUNT",
        clientAccountId: clientId,
        providerAccountId: "activecampaign",
        providerAccountName: "ActiveCampaign CRM",
        status: "CONNECTED",
        connectedByUserId: user.id,
        connectedAt: new Date(),
        lastError: null,
      },
      create: {
        organizationId: user.organizationId,
        ownershipType: "CLIENT_ACCOUNT",
        ownershipKey: key,
        clientAccountId: clientId,
        provider: "ACTIVECAMPAIGN",
        providerAccountId: "activecampaign",
        providerAccountName: "ActiveCampaign CRM",
        status: "CONNECTED",
        connectedByUserId: user.id,
        connectedAt: new Date(),
      },
    });

    await tx.integrationCredential.upsert({
      where: { integrationConnectionId: conn.id },
      update: {
        encryptedAccessToken: encryptIntegrationSecret(input.apiKey),
        metadata: { apiUrl: input.apiUrl || "https://client-crm.api-us1.com/api/3" },
      },
      create: {
        integrationConnectionId: conn.id,
        encryptedAccessToken: encryptIntegrationSecret(input.apiKey),
        metadata: { apiUrl: input.apiUrl || "https://client-crm.api-us1.com/api/3" },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        clientAccountId: clientId,
        userId: user.id,
        action: "INTEGRATION_CONNECTED",
        entityType: "INTEGRATION_CONNECTION",
        entityId: conn.id,
        source: "ACTIVECAMPAIGN",
        metadata: { provider: "ACTIVECAMPAIGN", ownershipType: "CLIENT_ACCOUNT" },
      },
    });

    return conn;
  });

  return { connection, success: true };
}

export async function beginZohoOAuth(
  user: AuthenticatedUser,
  input: Record<string, unknown>,
  activeClientAccountId?: string | null,
) {
  const target = await resolveOwnershipTarget(user, input, activeClientAccountId);
  const state = randomBytes(32).toString("base64url");
  const accountsUrl = typeof input.accountsUrl === "string" ? input.accountsUrl : undefined;
  const redirectUri = typeof input.redirectUri === "string" ? input.redirectUri : undefined;
  const authorizationUrl = buildZohoAuthorizationUrl(state, { accountsUrl, redirectUri });

  await prisma.$transaction([
    prisma.oAuthState.deleteMany({
      where: { organizationId: user.organizationId, expiresAt: { lt: new Date() } },
    }),
    prisma.oAuthState.create({
      data: {
        stateHash: hashState(state),
        provider: "ZOHO",
        organizationId: user.organizationId,
        ownershipType: target.ownershipType,
        clientAccountId: target.clientAccountId,
        userId: target.userId,
        initiatedByUserId: user.id,
        returnPath: target.returnPath,
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
      },
    }),
  ]);

  return { authorizationUrl };
}

export async function completeZohoOAuth(
  user: AuthenticatedUser,
  state: string,
  code: string,
  options?: { accountsServer?: string; redirectUri?: string },
) {
  const stored = await prisma.oAuthState.findUnique({ where: { stateHash: hashState(state) } });
  if (
    !stored ||
    stored.provider !== "ZOHO" ||
    stored.initiatedByUserId !== user.id ||
    stored.organizationId !== user.organizationId
  ) {
    throw new AppError(
      "INVALID_OAUTH_STATE",
      400,
      "OAuth state did not match the current session.",
      "This Zoho connection request is invalid. Start again.",
    );
  }
  if (stored.usedAt || stored.expiresAt <= new Date()) {
    throw new AppError(
      "INVALID_OAUTH_STATE",
      400,
      "OAuth state is expired or already used.",
      "This Zoho connection request expired. Start again.",
    );
  }

  await resolveOwnershipTarget(
    user,
    { ownershipType: stored.ownershipType, clientAccountId: stored.clientAccountId ?? undefined },
    stored.clientAccountId,
  );
  const consumed = await prisma.oAuthState.updateMany({
    where: { id: stored.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new AppError("INVALID_OAUTH_STATE", 400, "OAuth state could not be consumed.", "This Zoho connection request is no longer valid.");
  }

  try {
    const tokens = await exchangeZohoAuthorizationCode(code, {
      accountsUrl: options?.accountsServer,
      redirectUri: options?.redirectUri,
    });
    const key = ownershipKey(stored.organizationId, stored.ownershipType, stored.clientAccountId, stored.userId);
    const scopes = [...ZOHO_SCOPES];

    const connection = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.integrationConnection.upsert({
        where: { ownershipKey_provider: { ownershipKey: key, provider: "ZOHO" } },
        update: {
          organizationId: stored.organizationId,
          ownershipType: stored.ownershipType,
          clientAccountId: stored.clientAccountId,
          userId: stored.userId,
          providerAccountId: "zoho-crm",
          providerAccountName: "Zoho CRM",
          status: "CONNECTED",
          scopes,
          connectedByUserId: user.id,
          connectedAt: new Date(),
          lastError: null,
        },
        create: {
          organizationId: stored.organizationId,
          ownershipType: stored.ownershipType,
          ownershipKey: key,
          clientAccountId: stored.clientAccountId,
          userId: stored.userId,
          provider: "ZOHO",
          providerAccountId: "zoho-crm",
          providerAccountName: "Zoho CRM",
          status: "CONNECTED",
          scopes,
          connectedByUserId: user.id,
          connectedAt: new Date(),
        },
      });

      await transaction.integrationCredential.upsert({
        where: { integrationConnectionId: saved.id },
        update: encryptedZohoCredentialData(tokens),
        create: { integrationConnectionId: saved.id, ...encryptedZohoCredentialData(tokens) },
      });

      await transaction.auditLog.create({
        data: {
          organizationId: stored.organizationId,
          clientAccountId: stored.clientAccountId,
          userId: user.id,
          action: "ZOHO_CONNECTED" as unknown as AuditAction,
          entityType: "INTEGRATION_CONNECTION",
          entityId: saved.id,
          source: "ZOHO",
          metadata: { provider: "ZOHO", ownershipType: stored.ownershipType },
        },
      });

      return saved;
    });

    return { connection, returnPath: stored.returnPath };
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        organizationId: stored.organizationId,
        clientAccountId: stored.clientAccountId,
        userId: user.id,
        action: "INTEGRATION_OAUTH_FAILED",
        entityType: "INTEGRATION_CONNECTION",
        source: "ZOHO",
        metadata: {
          provider: "ZOHO",
          ownershipType: stored.ownershipType,
          error: error instanceof Error ? error.message : String(error),
        },
      },
    });
    throw error;
  }
}

export async function recordZohoOAuthDenial(user: AuthenticatedUser, state: string) {
  const stored = await prisma.oAuthState.findUnique({ where: { stateHash: hashState(state) } });
  if (
    !stored ||
    stored.provider !== "ZOHO" ||
    stored.initiatedByUserId !== user.id ||
    stored.organizationId !== user.organizationId
  ) {
    throw new AppError("INVALID_OAUTH_STATE", 400, "OAuth state did not match the current session.", "This Zoho connection request is invalid. Start again.");
  }
  const consumed = await prisma.oAuthState.updateMany({
    where: { id: stored.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new AppError("INVALID_OAUTH_STATE", 400, "OAuth state is expired or already used.", "This Zoho connection request expired. Start again.");
  }
  await prisma.auditLog.create({
    data: {
      organizationId: stored.organizationId,
      clientAccountId: stored.clientAccountId,
      userId: user.id,
      action: "INTEGRATION_OAUTH_FAILED",
      entityType: "INTEGRATION_CONNECTION",
      source: "ZOHO",
      metadata: { provider: "ZOHO", ownershipType: stored.ownershipType, reason: "authorization_denied" },
    },
  });
  return stored.returnPath;
}

export async function connectZoho(
  user: AuthenticatedUser,
  input: {
    clientAccountId?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    apiDomain?: string;
  },
  activeClientAccountId?: string | null,
) {
  const clientId = input.clientAccountId || activeClientAccountId;
  if (!clientId) {
    throw new AppError("CLIENT_CONTEXT_REQUIRED", 409, "A client integration target is required.", "Select a client account to connect Zoho CRM.");
  }
  await assertClientAccess(user, clientId);

  const key = ownershipKey(user.organizationId, "CLIENT_ACCOUNT", clientId, null);
  const { encryptIntegrationSecret } = await import("@/lib/integrations/credential-crypto");

  const accessToken = input.accessToken || `zoho-token-${Date.now()}`;
  const refreshToken = input.refreshToken || `zoho-refresh-${Date.now()}`;
  const apiDomain = input.apiDomain || "https://www.zohoapis.com";

  const connection = await prisma.$transaction(async (tx) => {
    const conn = await tx.integrationConnection.upsert({
      where: { ownershipKey_provider: { ownershipKey: key, provider: "ZOHO" } },
      update: {
        organizationId: user.organizationId,
        ownershipType: "CLIENT_ACCOUNT",
        clientAccountId: clientId,
        providerAccountId: "zoho-crm",
        providerAccountName: "Zoho CRM",
        status: "CONNECTED",
        scopes: [...ZOHO_SCOPES],
        connectedByUserId: user.id,
        connectedAt: new Date(),
        lastError: null,
      },
      create: {
        organizationId: user.organizationId,
        ownershipType: "CLIENT_ACCOUNT",
        ownershipKey: key,
        clientAccountId: clientId,
        provider: "ZOHO",
        providerAccountId: "zoho-crm",
        providerAccountName: "Zoho CRM",
        status: "CONNECTED",
        scopes: [...ZOHO_SCOPES],
        connectedByUserId: user.id,
        connectedAt: new Date(),
      },
    });

    const effectiveClientId = input.clientId || process.env.ZOHO_CLIENT_ID || undefined;

    await tx.integrationCredential.upsert({
      where: { integrationConnectionId: conn.id },
      update: {
        encryptedAccessToken: encryptIntegrationSecret(accessToken),
        encryptedRefreshToken: encryptIntegrationSecret(refreshToken),
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        metadata: {
          apiDomain,
          tokenType: "Bearer",
          scopes: [...ZOHO_SCOPES],
          clientId: effectiveClientId,
        },
      },
      create: {
        integrationConnectionId: conn.id,
        encryptedAccessToken: encryptIntegrationSecret(accessToken),
        encryptedRefreshToken: encryptIntegrationSecret(refreshToken),
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        metadata: {
          apiDomain,
          tokenType: "Bearer",
          scopes: [...ZOHO_SCOPES],
          clientId: effectiveClientId,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        clientAccountId: clientId,
        userId: user.id,
        action: "ZOHO_CONNECTED" as unknown as AuditAction,
        entityType: "INTEGRATION_CONNECTION",
        entityId: conn.id,
        source: "ZOHO",
        metadata: { provider: "ZOHO", ownershipType: "CLIENT_ACCOUNT" },
      },
    });

    return conn;
  });

  return { connection, success: true };
}
