import "server-only";
import { createHash, randomBytes } from "crypto";
import type { CalendarConnection, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { encryptIntegrationSecret, decryptIntegrationSecret } from "@/lib/integrations/credential-crypto";
import type { AuthenticatedUser } from "@/lib/models/canonical";
import { calendarAuthorizationUrl, calendarIsConfigured, calendarProfile, calendarTokenRequest } from "@/lib/calendar/calendar-oauth";
import { remoteCalendarProviders, type RemoteCalendarProvider, type CalendarConnectionSummary } from "@/lib/calendar/calendar-types";

const hash = (state: string) => createHash("sha256").update(state).digest("hex");
export function requireCalendarAgent(user: AuthenticatedUser) {
  if (user.role !== "AGENT") throw new AppError("FORBIDDEN", 403, "Agent calendar required.", "Personal calendars are connected from the agent workspace.");
}
export async function listCalendarConnections(user: AuthenticatedUser): Promise<CalendarConnectionSummary[]> {
  requireCalendarAgent(user);
  const connections = await prisma.calendarConnection.findMany({ where: { organizationId: user.organizationId, userId: user.id }, select: { provider: true, accountName: true, status: true } });
  return remoteCalendarProviders.map(provider => {
    const connection = connections.find(item => item.provider === provider);
    return { provider, configured: calendarIsConfigured(provider), connected: connection?.status === "CONNECTED", accountName: connection?.accountName ?? null, status: connection?.status ?? "DISCONNECTED" };
  });
}
export async function beginCalendarConnection(user: AuthenticatedUser, provider: RemoteCalendarProvider) {
  requireCalendarAgent(user);
  const state = randomBytes(32).toString("base64url"), verifier = randomBytes(32).toString("base64url");
  const url = calendarAuthorizationUrl(provider, state, verifier);
  const encryptedVerifier = encryptIntegrationSecret(verifier);
  await prisma.calendarOAuthState.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
  await prisma.calendarOAuthState.create({ data: { stateHash: hash(state), provider, organizationId: user.organizationId, userId: user.id, encryptedVerifier, expiresAt: new Date(Date.now() + 600_000) } });
  return url;
}
export async function completeCalendarConnection(user: AuthenticatedUser, provider: RemoteCalendarProvider, state: string, code: string, requestId: string) {
  requireCalendarAgent(user);
  if (!state || !code || state.length > 256 || code.length > 4096) throw new AppError("INVALID_OAUTH_STATE", 422, "Invalid calendar callback.", "Start the calendar connection again.");
  const record = await prisma.calendarOAuthState.findFirst({ where: { stateHash: hash(state), provider, organizationId: user.organizationId, userId: user.id, usedAt: null, expiresAt: { gt: new Date() } } });
  if (!record || !(await prisma.calendarOAuthState.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })).count) throw new AppError("INVALID_OAUTH_STATE", 422, "Calendar state expired or already used.", "Start the calendar connection again.");
  const token = await calendarTokenRequest(provider, { grant_type: "authorization_code", code, ...(provider === "CALENDLY" ? {} : { code_verifier: decryptIntegrationSecret(record.encryptedVerifier!) }) });
  const profile = await calendarProfile(provider, token.access_token);
  if (!token.refresh_token) throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Offline calendar access was not granted.", "Reconnect the calendar and grant offline access.");
  const data = { organizationId: user.organizationId, providerAccountId: profile.id, accountName: profile.name, status: "CONNECTED" as const, encryptedAccessToken: encryptIntegrationSecret(token.access_token), encryptedRefreshToken: encryptIntegrationSecret(token.refresh_token), accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000), scopes: token.scope?.split(" ") ?? [], connectedAt: new Date() };
  await prisma.$transaction(async tx => {
    // Disconnect invalidates even a callback already exchanging its code.
    await tx.$queryRaw`SELECT "id" FROM "CalendarOAuthState" WHERE "id" = ${record.id} FOR UPDATE`;
    if (!await tx.calendarOAuthState.findUnique({ where: { id: record.id } })) throw new AppError("INVALID_OAUTH_STATE", 422, "Calendar connection was cancelled.", "Start the calendar connection again.");
    await tx.calendarConnection.upsert({ where: { userId_provider: { userId: user.id, provider } }, create: { userId: user.id, provider, ...data }, update: data });
    await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "CALENDAR_CONNECTED", entityType: "CALENDAR_CONNECTION", source: "PLATFORM", requestId, metadata: { provider } } });
  });
}
export async function disconnectCalendar(user: AuthenticatedUser, provider: RemoteCalendarProvider, requestId: string) {
  requireCalendarAgent(user);
  await prisma.$transaction(async tx => {
    // Match callback lock order: state, then connection.
    await tx.calendarOAuthState.deleteMany({ where: { userId: user.id, provider } });
    await tx.$queryRaw`SELECT "id" FROM "CalendarConnection" WHERE "userId" = ${user.id} AND "provider"::text = ${provider} AND "organizationId" = ${user.organizationId} FOR UPDATE`;
    await tx.calendarConnection.updateMany({ where: { organizationId: user.organizationId, userId: user.id, provider }, data: { status: "DISCONNECTED", encryptedAccessToken: null, encryptedRefreshToken: null, accessTokenExpiresAt: null } });
    await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "CALENDAR_DISCONNECTED", entityType: "CALENDAR_CONNECTION", source: "PLATFORM", requestId, metadata: { provider } } });
  });
}
/** Caller locks the connection row, serializing refresh-token rotation and disconnect. */
export async function calendarAccessToken(tx: Prisma.TransactionClient, connection: CalendarConnection, provider: RemoteCalendarProvider) {
  if (connection.status !== "CONNECTED" || !connection.encryptedAccessToken) throw new AppError("CALENDAR_PROVIDER_UNAVAILABLE", 422, "Calendar is disconnected.", "Reconnect this calendar or use the manual calendar.");
  if (connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) return decryptIntegrationSecret(connection.encryptedAccessToken);
  if (!connection.encryptedRefreshToken) throw new AppError("CALENDAR_PROVIDER_UNAVAILABLE", 422, "Calendar refresh credentials are missing.", "Reconnect this calendar or use the manual calendar.");
  const token = await calendarTokenRequest(provider, { grant_type: "refresh_token", refresh_token: decryptIntegrationSecret(connection.encryptedRefreshToken) });
  await tx.calendarConnection.update({ where: { id: connection.id }, data: { encryptedAccessToken: encryptIntegrationSecret(token.access_token), encryptedRefreshToken: token.refresh_token ? encryptIntegrationSecret(token.refresh_token) : connection.encryptedRefreshToken, accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000) } });
  return token.access_token;
}
