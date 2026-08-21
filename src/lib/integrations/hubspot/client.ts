import { HubSpotContactsApiResponse } from "./types";
import { AppError } from "@/lib/errors/app-error";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

/**
 * Server-side client for fetching contacts from HubSpot CRM v3 API.
 * Uses HUBSPOT_ACCESS_TOKEN from process.env (never exposed to client).
 */
export async function fetchHubSpotContacts(limit = 100): Promise<HubSpotContactsApiResponse> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    throw new AppError(
      "INTEGRATION_CONFIGURATION_ERROR",
      503,
      "HUBSPOT_ACCESS_TOKEN is missing.",
      "HubSpot import is not configured for this environment.",
    );
  }

  // Request explicitly required properties since v3 defaults to a minimal set
  const requestedProperties = ["firstname", "lastname", "email", "phone", "company", "createdate", "lastmodifieddate"];
  const url = new URL(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("properties", requestedProperties.join(","));

  console.log(`[HubSpot Client] Requesting contacts from ${url.pathname}...`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    // Prevent Next.js from caching CRM API responses aggressively in this POC
    cache: "no-store",
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = await response.text();
    }

    console.error(`[HubSpot Client] Error ${response.status}: ${errorDetail}`);

    if (response.status === 401) {
      throw new AppError(
        "EXTERNAL_SERVICE_ERROR",
        502,
        "HubSpot authentication failed.",
        "HubSpot authentication needs attention. Please reconnect the client account.",
      );
    }
    if (response.status === 403) {
      throw new AppError(
        "EXTERNAL_SERVICE_ERROR",
        502,
        "HubSpot access was forbidden.",
        "HubSpot does not have permission to read contacts for this client account.",
      );
    }
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `HubSpot API responded with status ${response.status}: ${errorDetail}`,
      "HubSpot could not complete the import. Try again or use a manual import.",
    );
  }

  const data: HubSpotContactsApiResponse = await response.json();
  console.log(`[HubSpot Client] Successfully retrieved ${data.results?.length || 0} contacts.`);

  return data;
}
