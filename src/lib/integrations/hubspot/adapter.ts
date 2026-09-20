import { fetchHubSpotContacts, updateHubSpotContact } from "./client";
import { mapHubSpotContactToNormalized } from "./mapper";
import type { CrmAdapter } from "@/lib/integrations/types";

/** Keeps HubSpot API details behind the platform provider contract. */
export const hubSpotContactAdapter: CrmAdapter = {
  provider: "HUBSPOT",
  capabilities: { oauth: true, listContacts: true, updateContact: true, disconnect: true },
  async listContacts(connection, options) {
    const response = await fetchHubSpotContacts(connection, options?.limit);
    return response.results.map(mapHubSpotContactToNormalized);
  },
  updateContact(connection, externalId, contact) {
    return updateHubSpotContact(connection, externalId, contact);
  },
};
