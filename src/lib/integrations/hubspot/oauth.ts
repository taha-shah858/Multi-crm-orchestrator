import "server-only";

import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "@/lib/integrations/credential-crypto";

const HUBSPOT_AUTHORIZE_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/2026-03/token";
const HUBSPOT_REVOKE_URL = "https://api.hubapi.com/oauth/2026-03/token/revoke";
export const HUBSPOT_CONTACT_SCOPES = ["crm.objects.contacts.read", "crm.objects.contacts.write"] as const;

interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  hub_id?: number;
  scopes?: string[];
}

function oauthConfig() {
  const clientId = process.env.HUBSPOT_CLIENT_ID?.trim();
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET?.trim();
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new AppError(
      "INTEGRATION_CONFIGURATION_ERROR",
      503,
      "HubSpot OAuth client configuration is incomplete.",
      "HubSpot OAuth is not configured on this server.",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildHubSpotAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = oauthConfig();
  const url = new URL(HUBSPOT_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", HUBSPOT_CONTACT_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

async function tokenRequest(values: Record<string, string>) {
  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `HubSpot OAuth token request failed with HTTP ${response.status}.`,
      response.status === 400 || response.status === 401
        ? "HubSpot authorization was rejected. Start the connection again."
        : "HubSpot is temporarily unavailable. Try connecting again.",
    );
  }
  const payload = await response.json() as Partial<HubSpotTokenResponse>;
  if (!payload.access_token || !payload.refresh_token || typeof payload.expires_in !== "number") {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "HubSpot returned an incomplete token response.", "HubSpot authorization could not be completed.");
  }
  return payload as HubSpotTokenResponse;
}

export async function exchangeHubSpotAuthorizationCode(code: string) {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  return tokenRequest({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code });
}

async function refreshHubSpotToken(refreshToken: string) {
  const { clientId, clientSecret } = oauthConfig();
  return tokenRequest({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken });
}

function resolveLegacyServerReference(reference: string) {
  if (!reference.startsWith("env:")) return null;
  const variableName = reference.slice(4);
  if (!/^HUBSPOT(?:_[A-Z0-9]+)*_ACCESS_TOKEN$/.test(variableName)) {
    throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, "Legacy HubSpot credential reference is not allowed.", "Reconnect this HubSpot account using OAuth.");
  }
  const token = process.env[variableName];
  if (!token) throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, `Legacy HubSpot credential ${variableName} is missing.`, "Reconnect this HubSpot account using OAuth.");
  return token;
}

export async function getValidHubSpotAccessToken(connection: IntegrationConnection) {
  const credential = await prisma.integrationCredential.findUnique({ where: { integrationConnectionId: connection.id } });
  if (!credential) throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, `Connection ${connection.id} has no credential.`, "Reconnect this HubSpot account.");

  const legacy = resolveLegacyServerReference(credential.encryptedAccessToken);
  if (legacy) return legacy;

  const refreshNeeded = credential.accessTokenExpiresAt
    ? credential.accessTokenExpiresAt.getTime() <= Date.now() + 120_000
    : false;
  if (!refreshNeeded) return decryptIntegrationSecret(credential.encryptedAccessToken);
  if (!credential.encryptedRefreshToken) {
    await prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: "AUTHENTICATION_REQUIRED", lastError: "Refresh credential is unavailable." } });
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "HubSpot refresh token is unavailable.", "Reconnect this HubSpot account.");
  }

  try {
    const refreshed = await refreshHubSpotToken(decryptIntegrationSecret(credential.encryptedRefreshToken));
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    await prisma.$transaction([
      prisma.integrationCredential.update({
        where: { integrationConnectionId: connection.id },
        data: {
          encryptedAccessToken: encryptIntegrationSecret(refreshed.access_token),
          encryptedRefreshToken: encryptIntegrationSecret(refreshed.refresh_token),
          accessTokenExpiresAt: expiresAt,
          metadata: { tokenType: "oauth", hubId: refreshed.hub_id ?? connection.providerAccountId, scopes: refreshed.scopes ?? connection.scopes },
        },
      }),
      prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: "CONNECTED", scopes: refreshed.scopes ?? connection.scopes, lastError: null } }),
    ]);
    return refreshed.access_token;
  } catch (error) {
    const safeMessage = error instanceof AppError ? error.safeMessage : "HubSpot credentials could not be refreshed.";
    await prisma.$transaction([
      prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: "AUTHENTICATION_REQUIRED", lastError: safeMessage } }),
      prisma.auditLog.create({ data: { organizationId: connection.organizationId, clientAccountId: connection.clientAccountId, action: "INTEGRATION_CREDENTIAL_REFRESH_FAILED", entityType: "INTEGRATION_CONNECTION", entityId: connection.id, source: "HUBSPOT", metadata: { provider: "HUBSPOT" } } }),
    ]);
    throw error;
  }
}

export async function revokeHubSpotCredential(connectionId: string) {
  const credential = await prisma.integrationCredential.findUnique({ where: { integrationConnectionId: connectionId } });
  if (!credential?.encryptedRefreshToken) return;
  const refreshToken = decryptIntegrationSecret(credential.encryptedRefreshToken);
  const { clientId, clientSecret } = oauthConfig();
  const response = await fetch(HUBSPOT_REVOKE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token: refreshToken, token_type_hint: "refresh_token" }),
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, `HubSpot revoke failed with HTTP ${response.status}.`, "HubSpot could not be disconnected. Try again.");
  }
}

export function encryptedHubSpotCredentialData(tokens: HubSpotTokenResponse) {
  return {
    encryptedAccessToken: encryptIntegrationSecret(tokens.access_token),
    encryptedRefreshToken: encryptIntegrationSecret(tokens.refresh_token),
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    metadata: { tokenType: "oauth", hubId: tokens.hub_id ?? null, scopes: tokens.scopes ?? [...HUBSPOT_CONTACT_SCOPES] },
  };
}
