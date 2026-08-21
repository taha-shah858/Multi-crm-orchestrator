import { fetchHubSpotContacts } from "./client";
import { mapHubSpotContactToNormalized } from "./mapper";
import type { CrmAdapter } from "@/lib/integrations/types";

/** Keeps HubSpot API details behind the platform provider contract. */
export const hubSpotContactAdapter: CrmAdapter = {
  provider: "HUBSPOT",
  async listContacts(options) {
    const response = await fetchHubSpotContacts(options?.limit);
    return response.results.map(mapHubSpotContactToNormalized);
  },
};
