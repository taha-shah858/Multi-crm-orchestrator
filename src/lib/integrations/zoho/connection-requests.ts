import "server-only";
import { createHash, randomBytes } from "crypto";
import type { Prisma, ZohoConnectionRequest } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { AuthenticatedUser } from "@/lib/models/canonical";
import { isAdminWorkspaceRole } from "@/lib/auth/roles";
import { decryptIntegrationSecret } from "@/lib/integrations/credential-crypto";
import { accountsForApi, verifyZohoIdentity } from "./identity";
import { buildZohoAuthorizationUrl, encryptedZohoCredentialData, exchangeZohoAuthorizationCode, refreshZohoToken, zohoOauthConfig, ZOHO_SCOPES } from "./oauth";

type Db = Prisma.TransactionClient;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const emptySecrets = { encryptedAccessToken: null, encryptedRefreshToken: null, browserHash: null };
const pendingStatuses = ["PENDING", "AUTHORIZING", "PROCESSING", "REVIEW"];
const invalid = () => new AppError("INVALID_INVITATION", 400, "Invalid Zoho connection request.", "This connection request is expired, revoked or already used. Ask the agency for a new request.");

export function appOrigin() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
    (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, "Invalid app origin.", "Configure APP_URL with the application's public HTTPS origin.");
  }
  return url.origin;
}

export function invitationCookie(state: string) { return `zoho_invite_${hash(state).slice(0, 24)}`; }
export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin()) throw new AppError("FORBIDDEN", 403, "Cross-origin connection request rejected.", "Open the connection page on the application's own website.");
}

async function requireAdmin(actor: AuthenticatedUser, db: Db = prisma) {
  const current = await db.user.findUnique({ where: { id: actor.id } });
  if (!current || current.status !== "ACTIVE" || current.organizationId !== actor.organizationId || !isAdminWorkspaceRole(current.role)) throw new AppError("FORBIDDEN", 403, "Agency administrator required.", "An active agency administrator or manager must manage Zoho connection requests.");
}

async function validateCreator(request: ZohoConnectionRequest, db: Db = prisma) {
  if (request.expiresAt <= new Date()) throw invalid();
  const [creator, client] = await Promise.all([
    db.user.findUnique({ where: { id: request.createdById } }),
    db.clientAccount.findUnique({ where: { id: request.clientAccountId } }),
  ]);
  if (!creator || creator.status !== "ACTIVE" || creator.organizationId !== request.organizationId || !client || client.organizationId !== request.organizationId || client.status !== "ACTIVE") throw invalid();
  if (!isAdminWorkspaceRole(creator.role)) {
    if (request.source !== "DIRECT" || creator.role !== "AGENT" || !client.allowAgentIntegrationManagement ||
        !await db.clientAssignment.findUnique({ where: { clientAccountId_userId: { clientAccountId: client.id, userId: creator.id } } })) throw invalid();
  }
}

async function currentConnection(clientAccountId: string, organizationId: string, db: Db = prisma) {
  return db.integrationConnection.findFirst({ where: { organizationId, clientAccountId, ownershipType: "CLIENT_ACCOUNT", provider: "ZOHO" }, orderBy: { createdAt: "asc" } });
}
function fingerprint(connection: Awaited<ReturnType<typeof currentConnection>>) {
  return hash(JSON.stringify(connection ? [connection.id, connection.providerAccountId, connection.connectedAt?.toISOString()] : null));
}

// Run on explicit onboarding mutations, not ordinary CRM reads. Expired staged
// credentials are also excluded by every access/activation path.
export async function expireZohoRequests(organizationId: string) {
  await prisma.zohoConnectionRequest.updateMany({ where: { organizationId, expiresAt: { lte: new Date() }, status: { in: pendingStatuses } }, data: { status: "EXPIRED", ...emptySecrets } });
}

export async function prepareDirectZohoRequest(actor: AuthenticatedUser, clientAccountId: string, state: string, db: Db) {
  const connection = await currentConnection(clientAccountId, actor.organizationId, db);
  const request = await db.zohoConnectionRequest.create({ data: {
    organizationId: actor.organizationId, clientAccountId, createdById: actor.id, source: "DIRECT", status: "AUTHORIZING",
    stateHash: hash(state), baselineFingerprint: fingerprint(connection), expiresAt: new Date(Date.now() + 600000), oauthExpiresAt: new Date(Date.now() + 600000),
  } });
  await validateCreator(request, db);
  return request;
}

export async function createZohoInvitation(actor: AuthenticatedUser, clientAccountId: string) {
  await requireAdmin(actor);
  if (new URL(zohoOauthConfig().redirectUri).origin !== appOrigin()) throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, "App and callback origins differ.", "APP_URL and the Zoho callback must use the same application origin.");
  await expireZohoRequests(actor.organizationId);
  const client = await prisma.clientAccount.findFirst({ where: { id: clientAccountId, organizationId: actor.organizationId, status: "ACTIVE" } });
  if (!client) throw new AppError("CLIENT_ACCESS_DENIED", 403, "Client unavailable.", "Select an active client in your agency.");
  const token = random();
  const invitation = await prisma.$transaction(async db => {
    const request = await db.zohoConnectionRequest.create({ data: {
      organizationId: actor.organizationId, clientAccountId, createdById: actor.id, tokenHash: hash(token),
      baselineFingerprint: fingerprint(await currentConnection(clientAccountId, actor.organizationId, db)), expiresAt: new Date(Date.now() + 86400000),
    } });
    await db.auditLog.create({ data: { organizationId: actor.organizationId, clientAccountId, userId: actor.id, action: "ZOHO_CONNECTION_REQUESTED", entityType: "ZOHO_CONNECTION_REQUEST", entityId: request.id, source: "PLATFORM" } });
    return request;
  });
  // Fragment secrets do not enter HTTP access logs or the OAuth callback URL.
  return { id: invitation.id, expiresAt: invitation.expiresAt, invitationUrl: `${appOrigin()}/connect-zoho#token=${token}` };
}

async function invitationFor(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
  const request = await prisma.zohoConnectionRequest.findUnique({ where: { tokenHash: hash(token) } });
  if (!request || request.source !== "INVITATION" || request.status !== "PENDING") throw invalid();
  await validateCreator(request);
  return request;
}

export async function inspectZohoInvitation(token: string) {
  const request = await invitationFor(token);
  const [agency, client] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: request.organizationId }, select: { name: true } }),
    prisma.clientAccount.findUniqueOrThrow({ where: { id: request.clientAccountId }, select: { name: true } }),
  ]);
  return { agencyName: agency.name, clientName: client.name, expiresAt: request.expiresAt };
}

export async function beginInvitedZohoOAuth(token: string, accountsUrl?: string) {
  const request = await invitationFor(token);
  const state = `zi_${random()}`;
  const browser = random();
  const authorizationUrl = buildZohoAuthorizationUrl(state, { accountsUrl });
  const changed = await prisma.zohoConnectionRequest.updateMany({ where: { id: request.id, status: "PENDING", expiresAt: { gt: new Date() } }, data: {
    stateHash: hash(state), browserHash: hash(browser), status: "AUTHORIZING", oauthExpiresAt: new Date(Date.now() + 600000),
  } });
  if (changed.count !== 1) throw invalid();
  return { authorizationUrl, state, browser };
}

export async function stageZohoConsent(state: string, code: string, options: { accountsServer?: string; redirectUri?: string; browser?: string; actor?: AuthenticatedUser; denied?: boolean }) {
  const request = await prisma.zohoConnectionRequest.findUnique({ where: { stateHash: hash(state) } });
  if (!request || request.status !== "AUTHORIZING" || !request.oauthExpiresAt || request.oauthExpiresAt <= new Date()) throw invalid();
  await validateCreator(request);
  if (request.source === "INVITATION") {
    if (!options.browser || hash(options.browser) !== request.browserHash) throw invalid();
  } else if (!options.actor || options.actor.id !== request.createdById || options.actor.organizationId !== request.organizationId) throw invalid();
  const consumed = await prisma.zohoConnectionRequest.updateMany({ where: { id: request.id, status: "AUTHORIZING", expiresAt: { gt: new Date() }, oauthExpiresAt: { gt: new Date() } }, data: { status: "PROCESSING" } });
  if (consumed.count !== 1) throw invalid();
  try {
    if (options.denied) throw new AppError("INVALID_OAUTH_STATE", 400, "Consent declined.", "Zoho access was declined. No connection was changed.");
    const tokens = await exchangeZohoAuthorizationCode(code, { accountsUrl: options.accountsServer, redirectUri: options.redirectUri });
    if (!tokens.refresh_token) throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "No offline grant.", "Zoho did not grant offline access. Request authorization again.");
    const identity = await verifyZohoIdentity(tokens.access_token, tokens.api_domain!);
    const credentials = encryptedZohoCredentialData(tokens);
    await prisma.$transaction(async db => {
      await validateCreator(request, db);
      const changed = await db.zohoConnectionRequest.updateMany({ where: { id: request.id, status: "PROCESSING", expiresAt: { gt: new Date() } }, data: {
        status: "REVIEW", encryptedAccessToken: credentials.encryptedAccessToken, encryptedRefreshToken: credentials.encryptedRefreshToken, accessTokenExpiresAt: credentials.accessTokenExpiresAt,
        apiDomain: identity.apiDomain, accountsUrl: accountsForApi(identity.apiDomain),
        providerOrganizationId: identity.organizationId, providerOrganizationName: identity.organizationName, providerUserId: identity.userId, providerUserName: identity.userName,
        browserHash: null, expiresAt: new Date(request.source === "DIRECT" ? Date.now() + 3600000 : Math.min(request.expiresAt.getTime(), Date.now() + 3600000)),
      } });
      if (changed.count !== 1) throw invalid();
      await db.auditLog.create({ data: { organizationId: request.organizationId, clientAccountId: request.clientAccountId, userId: request.createdById, action: "ZOHO_CONSENT_RECEIVED", entityType: "ZOHO_CONNECTION_REQUEST", entityId: request.id, source: "ZOHO", metadata: { organizationId: identity.organizationId } } });
    });
    return { requestId: request.id };
  } catch (error) {
    await prisma.zohoConnectionRequest.updateMany({ where: { id: request.id, status: "PROCESSING" }, data: { status: "FAILED", ...emptySecrets } });
    throw error;
  }
}

export async function listZohoRequests(actor: AuthenticatedUser) {
  await requireAdmin(actor);
  const [rows, clients, connections] = await Promise.all([
    prisma.zohoConnectionRequest.findMany({ where: { organizationId: actor.organizationId }, select: {
      id: true, clientAccountId: true, source: true, status: true, expiresAt: true, createdAt: true,
      providerOrganizationId: true, providerOrganizationName: true, providerUserName: true,
      clientAccount: { select: { name: true } },
    }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.clientAccount.findMany({ where: { organizationId: actor.organizationId, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.integrationConnection.findMany({ where: { organizationId: actor.organizationId, ownershipType: "CLIENT_ACCOUNT", provider: "ZOHO" }, select: { id: true, clientAccountId: true, providerAccountId: true, providerAccountName: true } }),
  ]);
  return { requests: rows.map(row => ({ ...row, status: row.expiresAt <= new Date() && pendingStatuses.includes(row.status) ? "EXPIRED" : row.status })), clients, connections };
}

export async function revokeZohoRequest(actor: AuthenticatedUser, id: string) {
  await requireAdmin(actor);
  await prisma.$transaction(async db => {
    const result = await db.zohoConnectionRequest.updateMany({ where: { id, organizationId: actor.organizationId, status: { in: pendingStatuses } }, data: { status: "REVOKED", ...emptySecrets } });
    if (result.count !== 1) throw invalid();
    await db.auditLog.create({ data: { organizationId: actor.organizationId, userId: actor.id, action: "ZOHO_CONNECTION_REQUEST_REVOKED", entityType: "ZOHO_CONNECTION_REQUEST", entityId: id, source: "PLATFORM" } });
  });
  return { revoked: true };
}

export async function approveZohoRequest(actor: AuthenticatedUser, id: string, input: Record<string, unknown>) {
  await requireAdmin(actor);
  await expireZohoRequests(actor.organizationId);
  const request = await prisma.zohoConnectionRequest.findFirst({ where: { id, organizationId: actor.organizationId, status: "REVIEW" } });
  if (!request?.encryptedAccessToken || !request.encryptedRefreshToken || !request.apiDomain || !request.accountsUrl) throw invalid();
  await validateCreator(request);
  if (input.confirmedClientId !== request.clientAccountId || input.confirmedOrganizationId !== request.providerOrganizationId) throw new AppError("INVALID_REQUEST", 422, "Identity confirmation required.", "Confirm the displayed client and verified Zoho organization before approving.");
  const refreshToken = decryptIntegrationSecret(request.encryptedRefreshToken);
  let accessToken = decryptIntegrationSecret(request.encryptedAccessToken);
  let expiresAt = request.accessTokenExpiresAt!;
  if (expiresAt.getTime() - Date.now() < 60000) {
    const tokens = await refreshZohoToken(refreshToken, { accountsUrl: request.accountsUrl });
    if (tokens.api_domain && tokens.api_domain !== request.apiDomain) throw invalid();
    accessToken = tokens.access_token;
    expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  }
  // Recheck identity before activation; HTTP stays outside the database transaction.
  const identity = await verifyZohoIdentity(accessToken, request.apiDomain);
  if (identity.organizationId !== request.providerOrganizationId || identity.userId !== request.providerUserId) throw invalid();
  const credentials = encryptedZohoCredentialData({ access_token: accessToken, refresh_token: refreshToken, api_domain: request.apiDomain, expires_in: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) });
  return prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`zoho-org:${actor.organizationId}:${identity.organizationId}`}))`;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`zoho-client:${request.clientAccountId}`}))`;
    await db.$queryRaw`SELECT id FROM "ZohoConnectionRequest" WHERE id=${id} FOR UPDATE`;
    await db.$queryRaw`SELECT id FROM "User" WHERE id IN (${actor.id}, ${request.createdById}) ORDER BY id FOR SHARE`;
    await db.$queryRaw`SELECT id FROM "ClientAccount" WHERE id=${request.clientAccountId} FOR SHARE`;
    const latest = await db.zohoConnectionRequest.findUnique({ where: { id } });
    if (!latest || latest.status !== "REVIEW") throw invalid();
    await requireAdmin(actor, db);
    await validateCreator(latest, db);
    const existing = await currentConnection(request.clientAccountId, actor.organizationId, db);
    if (fingerprint(existing) !== request.baselineFingerprint) throw new AppError("INVALID_REQUEST", 409, "Connection changed during authorization.", "This client's connection changed. Create a new authorization request before replacing it.");
    if (existing && input.confirmReplacement !== true) throw new AppError("INVALID_REQUEST", 409, "Replacement confirmation required.", "Explicitly confirm replacing this client's existing Zoho connection.");
    if (await db.integrationConnection.findFirst({ where: { organizationId: actor.organizationId, provider: "ZOHO", providerAccountId: identity.organizationId, clientAccountId: { not: request.clientAccountId } } })) {
      throw new AppError("INVALID_REQUEST", 409, "Organization already connected elsewhere.", "This Zoho organization is already connected to a different client in your agency.");
    }
    if (existing && existing.providerAccountId !== identity.organizationId) {
      const [mappings, records, handoffs] = await Promise.all([
        db.externalRecord.count({ where: { connectionId: existing.id } }),
        db.clientCrmRecord.count({ where: { clientAccountId: request.clientAccountId, provider: "ZOHO" } }),
        db.dealHandoff.count({ where: { clientAccountId: request.clientAccountId, clientCrmProvider: "ZOHO" } }),
      ]);
      if (mappings || records || handoffs) throw new AppError("INVALID_REQUEST", 409, "Existing mappings cannot change organization.", "Existing Zoho records belong to the previous or unverified organization. Use a new client account or reconcile those mappings before changing organizations.");
    }
    const connection = await db.integrationConnection.upsert({ where: { ownershipKey_provider: { ownershipKey: `client:${request.clientAccountId}`, provider: "ZOHO" } },
      create: { organizationId: actor.organizationId, clientAccountId: request.clientAccountId, ownershipType: "CLIENT_ACCOUNT", ownershipKey: `client:${request.clientAccountId}`, provider: "ZOHO", providerAccountId: identity.organizationId, providerAccountName: identity.organizationName, status: "CONNECTED", scopes: [...ZOHO_SCOPES], connectedByUserId: actor.id, connectedAt: new Date() },
      update: { removedAt: null, providerAccountId: identity.organizationId, providerAccountName: identity.organizationName, status: "CONNECTED", scopes: [...ZOHO_SCOPES], connectedByUserId: actor.id, connectedAt: new Date(), lastError: null },
    });
    const data = { ...credentials, metadata: { ...credentials.metadata, organizationId: identity.organizationId, organizationName: identity.organizationName, verifiedUserId: identity.userId, identityVerifiedAt: new Date().toISOString() } };
    await db.integrationCredential.upsert({ where: { integrationConnectionId: connection.id }, create: { integrationConnectionId: connection.id, ...data }, update: data });
    await db.zohoConnectionRequest.update({ where: { id }, data: { status: "APPROVED", ...emptySecrets } });
    await db.zohoConnectionRequest.updateMany({ where: { clientAccountId: request.clientAccountId, id: { not: id }, status: { in: pendingStatuses } }, data: { status: "REVOKED", ...emptySecrets } });
    await db.auditLog.create({ data: { organizationId: actor.organizationId, clientAccountId: request.clientAccountId, userId: actor.id, action: "ZOHO_CONNECTED", entityType: "INTEGRATION_CONNECTION", entityId: connection.id, source: "ZOHO", metadata: { organizationId: identity.organizationId, replacement: Boolean(existing), requestId: id } } });
    return { connection: { id: connection.id, providerAccountId: connection.providerAccountId, providerAccountName: connection.providerAccountName } };
  });
}
