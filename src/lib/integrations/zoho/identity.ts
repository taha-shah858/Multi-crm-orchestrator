import "server-only";
import { AppError } from "@/lib/errors/app-error";

// Exact provider origins only; neither a callback nor token response may choose
// an arbitrary server that would receive client secrets or bearer tokens.
export const ZOHO_REGIONS = [
  ["United States", "https://accounts.zoho.com", "https://www.zohoapis.com"],
  ["Europe", "https://accounts.zoho.eu", "https://www.zohoapis.eu"],
  ["India", "https://accounts.zoho.in", "https://www.zohoapis.in"],
  ["Australia", "https://accounts.zoho.com.au", "https://www.zohoapis.com.au"],
  ["Japan", "https://accounts.zoho.jp", "https://www.zohoapis.jp"],
  ["Canada", "https://accounts.zohocloud.ca", "https://www.zohoapis.ca"],
  ["China", "https://accounts.zoho.com.cn", "https://www.zohoapis.com.cn"],
  ["Saudi Arabia", "https://accounts.zoho.sa", "https://www.zohoapis.sa"],
] as const;

export function zohoOrigin(value: string, type: "accounts" | "api") {
  const position = type === "accounts" ? 1 : 2;
  const normalized = value.replace(/\/$/, "");
  if (!ZOHO_REGIONS.some(region => region[position] === normalized)) {
    throw new AppError("INVALID_OAUTH_STATE", 400, "Unrecognized Zoho region.", "Select a supported Zoho data center.");
  }
  return normalized;
}

export function accountsForApi(apiDomain: string) {
  const domain = zohoOrigin(apiDomain, "api");
  return ZOHO_REGIONS.find(region => region[2] === domain)![1];
}

export async function verifyZohoIdentity(accessToken: string, apiDomain: string) {
  const domain = zohoOrigin(apiDomain, "api");
  async function read(resource: string) {
    try {
      const response = await fetch(`${domain}/crm/v8/${resource}`, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Identity unavailable");
      return await response.json();
    } catch {
      throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho identity lookup failed.", "Could not verify the Zoho organization. Enable ZohoCRM.org.READ and users.READ permissions and authorize again.");
    }
  }
  const [organization, user] = await Promise.all([read("org"), read("users?type=CurrentUser")]);
  const org = organization?.org?.length === 1 ? organization.org[0] : null;
  const currentUser = user?.users?.length === 1 ? user.users[0] : null;
  if (!org || typeof org.id !== "string" || !/^\d+$/.test(org.id) || typeof org.company_name !== "string" || !org.company_name.trim() ||
      !currentUser || typeof currentUser.id !== "string" || !/^\d+$/.test(currentUser.id) || typeof currentUser.full_name !== "string" || !currentUser.full_name.trim()) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho returned incomplete identity.", "The Zoho organization and authorizing user could not be verified. No connection was changed.");
  }
  return { organizationId: String(org.id), organizationName: org.company_name.trim().slice(0, 200), userId: String(currentUser.id), userName: currentUser.full_name.trim().slice(0, 200), apiDomain: domain };
}
