import type { IntegrationConnection } from "@prisma/client";
import type { ContactWriteInput } from "@/lib/integrations/types";
import { HubSpotContactsApiResponse } from "./types";
import { AppError } from "@/lib/errors/app-error";
import { getValidHubSpotAccessToken } from "@/lib/integrations/hubspot/oauth";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

function hubSpotHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchHubSpotContacts(
  connection: IntegrationConnection,
  limit = 100,
): Promise<HubSpotContactsApiResponse> {
  const token = await getValidHubSpotAccessToken(connection);

  // Request explicitly required properties since v3 defaults to a minimal set
  const requestedProperties = ["firstname", "lastname", "email", "phone", "company", "createdate", "lastmodifieddate"];
  const url = new URL(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("properties", requestedProperties.join(","));

  console.log(`[HubSpot Client] Requesting contacts from ${url.pathname}...`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: hubSpotHeaders(token),
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

/** Updates one mapped HubSpot contact using the selected connection only. */
export async function updateHubSpotContact(
  connection: IntegrationConnection,
  contactId: string,
  contact: ContactWriteInput,
) {
  const token = await getValidHubSpotAccessToken(connection);
  const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`, {
    method: "PATCH",
    headers: hubSpotHeaders(token),
    cache: "no-store",
    body: JSON.stringify({
      properties: {
        firstname: contact.firstName,
        lastname: contact.lastName,
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        company: contact.company ?? "",
      },
    }),
  });

  if (response.ok) return;

  let errorDetail = "";
  try {
    const errorJson = await response.json();
    errorDetail = errorJson.message || JSON.stringify(errorJson);
  } catch {
    errorDetail = await response.text();
  }
  console.error(`[HubSpot Client] Contact update ${response.status}: ${errorDetail}`);

  if (response.status === 401 || response.status === 403) {
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `HubSpot contact update authorization failed: ${errorDetail}`,
      "HubSpot could not authorize this contact update. Reconnect the selected client account and retry.",
    );
  }
  throw new AppError(
    "EXTERNAL_SERVICE_ERROR",
    502,
    `HubSpot contact update failed with status ${response.status}: ${errorDetail}`,
    "HubSpot could not update this contact. Your local edit is saved; retry when the connection is available.",
  );
}
