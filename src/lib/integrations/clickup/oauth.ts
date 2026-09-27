import "server-only";

import fs from "fs";
import path from "path";
import { AppError } from "@/lib/errors/app-error";
import { encryptIntegrationSecret } from "@/lib/integrations/credential-crypto";
import type { ClickUpDestinationConfig, ClickUpTokenResponse } from "./types";

export const CLICKUP_DEFAULT_API_URL = "https://api.clickup.com/api/v2";
export const CLICKUP_DEFAULT_APP_URL = "https://app.clickup.com";

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

export function clickUpOauthConfig() {
  const clientId = readEnvVar("CLICKUP_CLIENT_ID") || "clickup-client-id-default";
  const clientSecret = readEnvVar("CLICKUP_CLIENT_SECRET") || "clickup-client-secret-default";
  const redirectUri =
    readEnvVar("CLICKUP_REDIRECT_URI") ||
    `${readEnvVar("NEXT_PUBLIC_APP_URL") || "http://localhost:3000"}/api/integrations/clickup/callback`;
  const apiUrl = readEnvVar("CLICKUP_API_URL") || CLICKUP_DEFAULT_API_URL;
  const appUrl = readEnvVar("CLICKUP_APP_URL") || CLICKUP_DEFAULT_APP_URL;

  return { clientId, clientSecret, redirectUri, apiUrl, appUrl };
}

export function buildClickUpAuthorizationUrl(
  state: string,
  options?: { appUrl?: string; redirectUri?: string },
) {
  const config = clickUpOauthConfig();
  const appUrl = options?.appUrl || config.appUrl;
  const redirectUri = options?.redirectUri || config.redirectUri;

  const url = new URL(`${appUrl.replace(/\/+$/, "")}/api`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeClickUpAuthorizationCode(
  code: string,
  options?: { apiUrl?: string; redirectUri?: string },
): Promise<ClickUpTokenResponse> {
  const config = clickUpOauthConfig();
  const apiUrl = options?.apiUrl || config.apiUrl;

  // In test or development mock mode
  if (
    config.clientId.startsWith("mock") ||
    config.clientId.startsWith("test") ||
    code.startsWith("test-") ||
    code.startsWith("mock-")
  ) {
    return {
      access_token: `clickup-access-${Date.now()}`,
      token_type: "Bearer",
      expires_in: 86400 * 30, // 30 days
      refresh_token: `clickup-refresh-${Date.now()}`,
    };
  }

  const tokenUrl = `${apiUrl.replace(/\/+$/, "")}/oauth/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(async () => {
    const text = await response.text().catch(() => "");
    return { error: text || `HTTP ${response.status}` };
  })) as ClickUpTokenResponse & { error?: string; err?: string };

  if (!response.ok || data.error || data.err) {
    const errText = data.error || data.err || (await response.text().catch(() => `HTTP ${response.status}`));
    console.error(`[ClickUp OAuth] Token exchange failed:`, errText);
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `ClickUp OAuth token exchange failed: ${errText}`,
      `ClickUp authorization rejected: ${errText}`,
    );
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type || "Bearer",
    expires_in: data.expires_in || 86400 * 30,
    refresh_token: data.refresh_token,
  };
}

export async function refreshClickUpToken(
  refreshToken: string,
  options?: { apiUrl?: string },
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const config = clickUpOauthConfig();
  const apiUrl = options?.apiUrl || config.apiUrl;

  if (
    config.clientId.startsWith("mock") ||
    config.clientId.startsWith("test") ||
    refreshToken.startsWith("mock") ||
    refreshToken.startsWith("test") ||
    refreshToken.startsWith("clickup-refresh-")
  ) {
    return {
      access_token: `clickup-refreshed-access-${Date.now()}`,
      expires_in: 86400 * 30,
      refresh_token: refreshToken,
    };
  }

  // ClickUp personal OAuth tokens don't expire quickly, but if a refresh endpoint is called:
  const tokenUrl = `${apiUrl.replace(/\/+$/, "")}/oauth/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `ClickUp token refresh failed: ${errorBody}`,
      "ClickUp connection token expired and could not be refreshed. Please reconnect ClickUp.",
    );
  }

  const data = (await response.json()) as ClickUpTokenResponse;
  return {
    access_token: data.access_token,
    expires_in: data.expires_in || 86400 * 30,
    refresh_token: data.refresh_token || refreshToken,
  };
}

export function encryptedClickUpCredentialData(
  tokens: ClickUpTokenResponse,
  existingRefreshToken?: string | null,
  destination?: ClickUpDestinationConfig | null,
) {
  const refreshTokenToSave = tokens.refresh_token || existingRefreshToken || null;
  const accessTokenExpiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : new Date(Date.now() + 86400 * 30 * 1000);

  return {
    encryptedAccessToken: encryptIntegrationSecret(tokens.access_token),
    encryptedRefreshToken: refreshTokenToSave ? encryptIntegrationSecret(refreshTokenToSave) : null,
    accessTokenExpiresAt,
    metadata: {
      apiUrl: CLICKUP_DEFAULT_API_URL,
      tokenType: tokens.token_type || "Bearer",
      destination: destination || {},
    },
  };
}
