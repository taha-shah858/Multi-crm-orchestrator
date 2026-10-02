import "server-only";
import { createHash } from "crypto";
import { AppError } from "@/lib/errors/app-error";
import type { RemoteCalendarProvider } from "@/lib/calendar/calendar-types";

const settings = {
  GOOGLE: { prefix: "GOOGLE_CALENDAR", authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar.events.owned"] },
  OUTLOOK: { prefix: "OUTLOOK_CALENDAR", authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", token: "https://login.microsoftonline.com/common/oauth2/v2.0/token", scopes: ["offline_access", "User.Read", "Calendars.ReadWrite"] },
  CALENDLY: { prefix: "CALENDLY", authorize: "https://auth.calendly.com/oauth/authorize", token: "https://auth.calendly.com/oauth/token", scopes: ["users:read", "event_types:read", "scheduled_events:read", "scheduled_events:write"] },
} as const;
export interface CalendarTokens { access_token: string; refresh_token?: string; expires_in: number; scope?: string; }
export function calendarOAuthConfig(provider: RemoteCalendarProvider) {
  const config = settings[provider];
  const clientId = process.env[`${config.prefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${config.prefix}_CLIENT_SECRET`]?.trim();
  const redirectUri = process.env[`${config.prefix}_REDIRECT_URI`]?.trim();
  let uri: URL | undefined;
  try { uri = new URL(redirectUri ?? ""); } catch { /* Missing or invalid setup. */ }
  if (!clientId || !clientSecret || !uri || uri.username || uri.password || uri.search || uri.hash || (uri.protocol !== "https:" && !(uri.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname)))) {
    throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, "Calendar OAuth configuration is incomplete.", `${provider === "GOOGLE" ? "Google" : provider === "OUTLOOK" ? "Outlook" : "Calendly"} calendar connection needs server setup first.`);
  }
  return { ...config, clientId, clientSecret, redirectUri: uri.toString() };
}
export function calendarIsConfigured(provider: RemoteCalendarProvider) {
  try { calendarOAuthConfig(provider); return Boolean(process.env.INTEGRATION_ENCRYPTION_KEY); } catch { return false; }
}
export function calendarAuthorizationUrl(provider: RemoteCalendarProvider, state: string, verifier: string) {
  const config = calendarOAuthConfig(provider);
  const url = new URL(config.authorize);
  for (const [key, value] of Object.entries({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", state, scope: config.scopes.join(" ") })) url.searchParams.set(key, value);
  if (provider !== "CALENDLY") {
    url.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"));
    url.searchParams.set("code_challenge_method", "S256");
  }
  if (provider === "GOOGLE") { url.searchParams.set("access_type", "offline"); url.searchParams.set("prompt", "consent"); }
  return url.toString();
}
export async function calendarTokenRequest(provider: RemoteCalendarProvider, values: Record<string, string>): Promise<CalendarTokens> {
  const config = calendarOAuthConfig(provider);
  const response = await fetch(config.token, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", ...(provider === "CALENDLY" ? { authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}` } : {}) },
    body: new URLSearchParams({ ...(provider === "CALENDLY" ? {} : { client_id: config.clientId, client_secret: config.clientSecret }), redirect_uri: config.redirectUri, ...values }),
    cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new AppError("EXTERNAL_SERVICE_ERROR", 502, `Calendar token exchange failed (${response.status}).`, "Calendar authorization failed. Reconnect the calendar and try again.");
  const token = await response.json() as CalendarTokens;
  if (typeof token.access_token !== "string" || !token.access_token || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Invalid calendar token response.", "Calendar authorization returned an incomplete response. Reconnect the calendar.");
  return token;
}
export async function calendarProfile(provider: RemoteCalendarProvider, token: string) {
  const url = provider === "GOOGLE" ? "https://openidconnect.googleapis.com/v1/userinfo" : provider === "OUTLOOK" ? "https://graph.microsoft.com/v1.0/me?$select=id,displayName" : "https://api.calendly.com/users/me";
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Calendar profile lookup failed.", "The calendar account could not be verified. Reconnect it.");
  const payload = await response.json();
  const id = provider === "GOOGLE" ? payload.sub : provider === "OUTLOOK" ? payload.id : payload.resource?.uri;
  const name = provider === "GOOGLE" ? payload.email : provider === "OUTLOOK" ? payload.displayName : payload.resource?.name;
  if (typeof id !== "string" || !id || typeof name !== "string" || !name) throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Missing calendar account identity.", "The calendar account could not be verified. Reconnect it.");
  return { id, name };
}
