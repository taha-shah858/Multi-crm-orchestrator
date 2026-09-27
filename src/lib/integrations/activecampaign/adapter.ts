import type { IntegrationConnection } from "@prisma/client";
import type { ContactListOptions, ContactWriteInput, IntegrationAdapter } from "@/lib/integrations/types";
import type { NormalizedContact } from "@/lib/models/contact";
import {
  createOrUpdateActiveCampaignRecord,
  fetchActiveCampaignRecords,
} from "./client";

export const activeCampaignAdapter: IntegrationAdapter = {
  provider: "ACTIVECAMPAIGN",
  capabilities: {
    oauth: false,
    listContacts: true,
    updateContact: true,
    salesCrm: false,
    updateCompany: true,
    updateDeal: true,
    disconnect: true,
  },

  async listContacts(
    connection: IntegrationConnection,
    _options?: ContactListOptions,
  ): Promise<NormalizedContact[]> {
    const records = await fetchActiveCampaignRecords(connection);
    const contacts = records.filter((r) => r.recordType === "CONTACT");

    return contacts.map((c) => {
      const parts = c.name.split(" ");
      const firstName = parts[0] || "Client";
      const lastName = parts.slice(1).join(" ") || "Contact";
      return {
        id: c.externalId,
        first_name: firstName,
        last_name: lastName,
        email: c.email || "",
        phone: c.phone || "",
        company: c.companyName || "",
        source_crm: "ActiveCampaign",
        raw_created_at: new Date().toISOString(),
        raw_updated_at: new Date().toISOString(),
      };
    });
  },

  async updateContact(
    connection: IntegrationConnection,
    externalId: string,
    contact: ContactWriteInput,
  ): Promise<void> {
    await createOrUpdateActiveCampaignRecord(
      connection,
      "CONTACT",
      {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        orgname: contact.company,
      },
      externalId,
    );
  },
};
