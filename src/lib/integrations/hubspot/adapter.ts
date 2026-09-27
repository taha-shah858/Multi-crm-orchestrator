import {
  fetchHubSpotContacts,
  fetchHubSpotSalesCrm,
  updateHubSpotCompany,
  updateHubSpotContact,
  updateHubSpotDeal,
  createHubSpotDeal,
} from "./client";
import { mapHubSpotContactToNormalized } from "./mapper";
import type { CrmAdapter } from "@/lib/integrations/types";

/** Keeps HubSpot API details behind the platform provider contract. */
export const hubSpotContactAdapter: CrmAdapter = {
  provider: "HUBSPOT",
  capabilities: {
    oauth: true,
    listContacts: true,
    updateContact: true,
    salesCrm: true,
    updateCompany: true,
    updateDeal: true,
    createDeal: true,
    disconnect: true,
  },
  async listContacts(connection, options) {
    const response = await fetchHubSpotContacts(connection, options?.limit);
    return response.results.map(mapHubSpotContactToNormalized);
  },
  updateContact(connection, externalId, contact) {
    return updateHubSpotContact(connection, externalId, contact);
  },
  fetchSalesCrm(connection) {
    return fetchHubSpotSalesCrm(connection);
  },
  updateCompany(connection, externalId, company) {
    return updateHubSpotCompany(connection, externalId, company);
  },
  updateDeal(connection, externalId, deal) {
    return updateHubSpotDeal(connection, externalId, deal);
  },
  createDeal(connection, deal, contactExternalId) {
    return createHubSpotDeal(connection, deal, contactExternalId);
  },
};
