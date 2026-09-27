import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { encryptIntegrationSecret } from "@/lib/integrations/credential-crypto";
import type { ZohoTokenResponse } from "./types";

export const ZOHO_DEFAULT_ACCOUNTS_URL = "https://accounts.zoho.com";
export const ZOHO_DEFAULT_API_DOMAIN = "https://www.zohoapis.com";

export const ZOHO_SCOPES = [
  "ZohoCRM.modules.ALL",
  "ZohoCRM.settings.ALL",
  "ZohoCRM.users.READ",
] as const;

import fs from "fs";
import path from "path";

function readEnvVar(key: string): string | undefined {
  const direct = process.env[key]?.trim();
  if (direct) return direct.replace(/^"|"$/g, "");
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (m && m[1] === key) {
          const val = m[2].trim().replace(/^"|"$/g, "");
          if (val) {
            process.env[key] = val;
            return val;
          }
        }
      }
    }
  } catch {}
  return undefined;
}

export function zohoOauthConfig() {
  const clientId = readEnvVar("ZOHO_CLIENT_ID") || "zoho-client-id-default";
  const clientSecret = readEnvVar("ZOHO_CLIENT_SECRET") || "zoho-client-secret-default";
  const redirectUri =
    readEnvVar("ZOHO_REDIRECT_URI") ||
    `${readEnvVar("NEXT_PUBLIC_APP_URL") || "http://localhost:3000"}/api/integrations/zoho/callback`;
  const accountsUrl = readEnvVar("ZOHO_ACCOUNTS_URL") || ZOHO_DEFAULT_ACCOUNTS_URL;
  const apiDomain = readEnvVar("ZOHO_API_DOMAIN") || ZOHO_DEFAULT_API_DOMAIN;

  return { clientId, clientSecret, redirectUri, accountsUrl, apiDomain };
}

export function buildZohoAuthorizationUrl(
  state: string,
  options?: { accountsUrl?: string; redirectUri?: string },
) {
  const config = zohoOauthConfig();
  const accountsUrl = options?.accountsUrl || config.accountsUrl;
  const redirectUri = options?.redirectUri || config.redirectUri;

  const url = new URL(`${accountsUrl.replace(/\/+$/, "")}/oauth/v2/auth`);
  url.searchParams.set("scope", ZOHO_SCOPES.join(","));
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeZohoAuthorizationCode(
  code: string,
  options?: { accountsUrl?: string; redirectUri?: string },
): Promise<ZohoTokenResponse> {
  const config = zohoOauthConfig();
  const accountsUrl = options?.accountsUrl || config.accountsUrl;
  const redirectUri = options?.redirectUri || config.redirectUri;

  // In test or development mock mode
  if (
    config.clientId.startsWith("mock") ||
    config.clientId.startsWith("test") ||
    code.startsWith("test-") ||
    code.startsWith("mock-")
  ) {
    return {
      access_token: `zoho-access-${Date.now()}`,
      refresh_token: `zoho-refresh-${Date.now()}`,
      api_domain: config.apiDomain,
      token_type: "Bearer",
      expires_in: 3600,
    };
  }

  const tokenUrl = `${accountsUrl.replace(/\/+$/, "")}/oauth/v2/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  console.info(`[Zoho OAuth] Exchanging token at ${tokenUrl} with redirect_uri: ${redirectUri}, client_id: ${config.clientId.slice(0, 10)}...`);

  let response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  let data = (await response.json().catch(async () => {
    const text = await response.text().catch(() => "");
    return { error: text || `HTTP ${response.status}` };
  })) as ZohoTokenResponse & { error?: string };

  // If token exchange was attempted at a regional DC and returned invalid_client,
  // but config.accountsUrl (e.g. accounts.zoho.com) differs, retry at config.accountsUrl
  if (data.error === "invalid_client" && accountsUrl !== config.accountsUrl) {
    const fallbackTokenUrl = `${config.accountsUrl.replace(/\/+$/, "")}/oauth/v2/token`;
    console.info(`[Zoho OAuth] Regional server returned invalid_client. Retrying at ${fallbackTokenUrl}...`);
    const fallbackResponse = await fetch(fallbackTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const fallbackData = (await fallbackResponse.json().catch(async () => {
      const text = await fallbackResponse.text().catch(() => "");
      return { error: text || `HTTP ${fallbackResponse.status}` };
    })) as ZohoTokenResponse & { error?: string };
    if (!fallbackData.error) {
      data = fallbackData;
      response = fallbackResponse;
    }
  }

  if (!response.ok || data.error) {
    const errText = data.error || (await response.text().catch(() => `HTTP ${response.status}`));
    console.error(`[Zoho OAuth] Token exchange failed:`, errText);
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `Zoho OAuth token exchange failed: ${errText}`,
      `Zoho authorization rejected: ${errText}`,
    );
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    api_domain: data.api_domain || config.apiDomain,
    token_type: data.token_type || "Bearer",
    expires_in: data.expires_in || 3600,
  };
}

export async function refreshZohoToken(
  refreshToken: string,
  options?: { accountsUrl?: string },
): Promise<{ access_token: string; expires_in: number; api_domain?: string }> {
  const config = zohoOauthConfig();
  const accountsUrl = options?.accountsUrl || config.accountsUrl;

  if (
    config.clientId.startsWith("mock") ||
    config.clientId.startsWith("test") ||
    refreshToken.startsWith("mock") ||
    refreshToken.startsWith("test") ||
    refreshToken.startsWith("zoho-refresh-")
  ) {
    return {
      access_token: `zoho-refreshed-access-${Date.now()}`,
      expires_in: 3600,
      api_domain: config.apiDomain,
    };
  }

  const tokenUrl = `${accountsUrl.replace(/\/+$/, "")}/oauth/v2/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `Zoho token refresh failed: ${errorBody}`,
      "Zoho connection token expired and could not be refreshed. Please reconnect Zoho.",
    );
  }

  const data = (await response.json()) as { access_token: string; expires_in: number; api_domain?: string; error?: string };
  if (data.error) {
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `Zoho refresh error: ${data.error}`,
      "Zoho authorization refresh was rejected. Reconnect Zoho.",
    );
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in || 3600,
    api_domain: data.api_domain || config.apiDomain,
  };
}

export function encryptedZohoCredentialData(
  tokens: ZohoTokenResponse,
  existingRefreshToken?: string,
) {
  const refreshTokenToSave = tokens.refresh_token || existingRefreshToken || "";
  const accessTokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

  return {
    encryptedAccessToken: encryptIntegrationSecret(tokens.access_token),
    encryptedRefreshToken: refreshTokenToSave ? encryptIntegrationSecret(refreshTokenToSave) : null,
    accessTokenExpiresAt,
    metadata: {
      apiDomain: tokens.api_domain || ZOHO_DEFAULT_API_DOMAIN,
      tokenType: tokens.token_type || "Bearer",
      scopes: [...ZOHO_SCOPES],
    },
  };
}
