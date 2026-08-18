import { fetchHubSpotContacts } from "@/lib/integrations/hubspot/client";
import { mapHubSpotContactToNormalized } from "@/lib/integrations/hubspot/mapper";

/**
 * GET /api/contacts/import
 * Backend endpoint to fetch contacts from HubSpot CRM, normalize them into our
 * canonical NormalizedContact format, and return them to the caller.
 */
export async function GET() {
  console.log("[API: /api/contacts/import] Received contact import request.");

  try {
    const rawData = await fetchHubSpotContacts(100);
    const normalizedContacts = (rawData.results || []).map(mapHubSpotContactToNormalized);

    console.log(
      `[API: /api/contacts/import] Normalized ${normalizedContacts.length} contacts. Returning response.`
    );

    return Response.json(
      {
        success: true,
        count: normalizedContacts.length,
        contacts: normalizedContacts,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while importing contacts.";
    console.error("[API: /api/contacts/import] Error during import:", message);

    return Response.json(
      {
        success: false,
        error: message,
        contacts: [],
      },
      { status: 500 }
    );
  }
}
