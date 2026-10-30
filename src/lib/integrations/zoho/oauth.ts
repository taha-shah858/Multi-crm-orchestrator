import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { encryptIntegrationSecret } from "@/lib/integrations/credential-crypto";
import { accountsForApi, zohoOrigin } from "./identity";
import type { ZohoTokenResponse } from "./types";

export const ZOHO_DEFAULT_ACCOUNTS_URL = "https://accounts.zoho.com";
export const ZOHO_DEFAULT_API_DOMAIN = "https://www.zohoapis.com";
export const ZOHO_SCOPES = ["ZohoCRM.modules.ALL", "ZohoCRM.settings.ALL", "ZohoCRM.users.READ", "ZohoCRM.org.READ"] as const;

export function zohoOauthConfig() {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const redirectUri = process.env.ZOHO_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, "Missing Zoho OAuth settings.", "Configure the Zoho OAuth client and exact callback URL before connecting.");
  const callback = new URL(redirectUri);
  if (callback.username || callback.password || callback.search || callback.hash || callback.pathname !== "/api/integrations/zoho/callback" ||
    (callback.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && callback.protocol === "http:" && ["localhost", "127.0.0.1"].includes(callback.hostname)))) {
    throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, "Invalid Zoho callback.", "Configure a valid HTTPS Zoho callback, or localhost for development.");
  }
  return {
    clientId, clientSecret, redirectUri,
    accountsUrl: zohoOrigin(process.env.ZOHO_ACCOUNTS_URL?.trim() || ZOHO_DEFAULT_ACCOUNTS_URL, "accounts"),
    apiDomain: zohoOrigin(process.env.ZOHO_API_DOMAIN?.trim() || ZOHO_DEFAULT_API_DOMAIN, "api"),
  };
}

export function buildZohoAuthorizationUrl(state: string, options?: { accountsUrl?: string; redirectUri?: string }) {
  const config = zohoOauthConfig();
  if (options?.redirectUri && options.redirectUri !== config.redirectUri) throw new AppError("INVALID_OAUTH_STATE", 400, "Callback override rejected.", "Use the configured Zoho callback URL.");
  const url = new URL(`${zohoOrigin(options?.accountsUrl || config.accountsUrl, "accounts")}/oauth/v2/auth`);
  url.search = new URLSearchParams({ scope: ZOHO_SCOPES.join(","), client_id: config.clientId, response_type: "code", access_type: "offline", prompt: "consent", redirect_uri: config.redirectUri, state }).toString();
  return url.toString();
}

async function requestTokens(accountsUrl: string, body: URLSearchParams): Promise<ZohoTokenResponse> {
  try {
    const response = await fetch(`${zohoOrigin(accountsUrl, "accounts")}/oauth/v2/token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok || data.error || typeof data.access_token !== "string" || !data.access_token || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0) throw new Error("Token request rejected");
    return { access_token: data.access_token, refresh_token: typeof data.refresh_token === "string" ? data.refresh_token : undefined, expires_in: Number(data.expires_in), api_domain: data.api_domain ? zohoOrigin(data.api_domain, "api") : undefined, token_type: "Bearer" };
  } catch {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho token request failed.", "Zoho authorization failed. Check the account region, OAuth configuration and permissions, then try again.");
  }
}

export async function exchangeZohoAuthorizationCode(code: string, options?: { accountsUrl?: string; redirectUri?: string }): Promise<ZohoTokenResponse> {
  const config = zohoOauthConfig();
  if (!code || (options?.redirectUri && options.redirectUri !== config.redirectUri)) throw new AppError("INVALID_OAUTH_STATE", 400, "Invalid authorization response.", "Start Zoho authorization again.");
  const accountsUrl = zohoOrigin(options?.accountsUrl || config.accountsUrl, "accounts");
  const tokens = await requestTokens(accountsUrl, new URLSearchParams({ grant_type: "authorization_code", client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, code }));
  if (!tokens.api_domain || accountsForApi(tokens.api_domain) !== accountsUrl) throw new AppError("INVALID_OAUTH_STATE", 400, "Zoho region mismatch.", "Zoho returned a mismatched account region. Authorize again using the correct data center.");
  return tokens;
}

export async function refreshZohoToken(refreshToken: string, options?: { accountsUrl?: string }) {
  const config = zohoOauthConfig();
  // Legacy deterministic fixtures are never used by the authorization exchange.
  if (process.env.NODE_ENV !== "production" && /^(mock|test|zoho-refresh-)/.test(refreshToken)) return { access_token: `zoho-refreshed-access-${Date.now()}`, expires_in: 3600, api_domain: config.apiDomain };
  return requestTokens(options?.accountsUrl || config.accountsUrl, new URLSearchParams({ grant_type: "refresh_token", client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken }));
}

export function encryptedZohoCredentialData(tokens: ZohoTokenResponse, existingRefreshToken?: string) {
  const refreshToken = tokens.refresh_token || existingRefreshToken;
  const apiDomain = zohoOrigin(tokens.api_domain || ZOHO_DEFAULT_API_DOMAIN, "api");
  return {
    encryptedAccessToken: encryptIntegrationSecret(tokens.access_token),
    encryptedRefreshToken: refreshToken ? encryptIntegrationSecret(refreshToken) : null,
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    metadata: { apiDomain, accountsUrl: accountsForApi(apiDomain), tokenType: "Bearer", scopes: [...ZOHO_SCOPES] },
  };
}
