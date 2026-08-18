import { HubSpotContactsApiResponse } from "./types";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

/**
 * Server-side client for fetching contacts from HubSpot CRM v3 API.
 * Uses HUBSPOT_ACCESS_TOKEN from process.env (never exposed to client).
 */
export async function fetchHubSpotContacts(limit = 100): Promise<HubSpotContactsApiResponse> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "HUBSPOT_ACCESS_TOKEN is missing. Please configure it in .env.local on the server."
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
      throw new Error("HubSpot authentication failed. Check your HUBSPOT_ACCESS_TOKEN.");
    }
    if (response.status === 403) {
      throw new Error("HubSpot access forbidden. Ensure the token has the 'crm.objects.contacts.read' scope.");
    }
    throw new Error(`HubSpot API responded with status ${response.status}: ${errorDetail}`);
  }

  const data: HubSpotContactsApiResponse = await response.json();
  console.log(`[HubSpot Client] Successfully retrieved ${data.results?.length || 0} contacts.`);

  return data;
}
