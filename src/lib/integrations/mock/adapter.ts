import type { CrmAdapter } from "@/lib/integrations/types";

/**
 * A deterministic second provider for Phase 2 demonstrations and local sync
 * verification. It never contacts an external service or uses credentials.
 */
export const mockCrmAdapter: CrmAdapter = {
  provider: "MOCK",
  capabilities: { oauth: false, listContacts: true, updateContact: false, disconnect: false },
  async listContacts() {
    return [
      {
        id: "mock-contact-001",
        first_name: "Amina",
        last_name: "Rahman",
        email: "amina.rahman@example.test",
        phone: "+1-555-010-2001",
        company: "Atlas Revenue Partners",
        source_crm: "Mock CRM",
        raw_created_at: "2026-08-21T00:00:00.000Z",
        raw_updated_at: "2026-08-21T00:00:00.000Z",
      },
      {
        id: "mock-contact-002",
        first_name: "Daniel",
        last_name: "Cole",
        email: "daniel.cole@example.test",
        phone: "+1-555-010-2002",
        company: "Atlas Revenue Partners",
        source_crm: "Mock CRM",
        raw_created_at: "2026-08-21T00:00:00.000Z",
        raw_updated_at: "2026-08-21T00:00:00.000Z",
      },
    ];
  },
  async updateContact() {
    // The mock provider deliberately has no remote state. Keeping the write
    // capability makes local-first contact editing testable without an API key.
  },
};
