import type { IntegrationConnection } from "@prisma/client";
import type {
  ContactListOptions,
  ContactWriteInput,
  DealWriteInput,
  IntegrationAdapter,
} from "@/lib/integrations/types";
import type { NormalizedContact } from "@/lib/models/contact";
import {
  createOrUpdateZohoRecord,
  fetchZohoRecords,
} from "./client";

export const zohoAdapter: IntegrationAdapter = {
  provider: "ZOHO",
  capabilities: {
    oauth: true,
    listContacts: true,
    updateContact: true,
    salesCrm: false,
    updateCompany: false,
    updateDeal: true,
    disconnect: true,
  },

  async listContacts(
    connection: IntegrationConnection,
    _options?: ContactListOptions,
  ): Promise<NormalizedContact[]> {
    const records = await fetchZohoRecords(connection);
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
        source_crm: "Zoho",
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
    await createOrUpdateZohoRecord(
      connection,
      "CONTACT",
      {
        First_Name: contact.firstName,
        Last_Name: contact.lastName,
        Email: contact.email,
        Phone: contact.phone,
        Account_Name: contact.company ? { name: contact.company } : undefined,
      },
      externalId,
    );
  },

  async updateDeal(
    connection: IntegrationConnection,
    externalId: string,
    deal: DealWriteInput,
  ): Promise<void> {
    await createOrUpdateZohoRecord(
      connection,
      "DEAL",
      {
        Deal_Name: deal.name,
        Amount: deal.amount ? Number(deal.amount) : undefined,
        Stage: deal.stageId || undefined,
      },
      externalId,
    );
  },
};
