import type { NormalizedContact } from "@/lib/models/contact";
import type { IntegrationProvider } from "@/lib/models/canonical";
import type { IntegrationConnection } from "@prisma/client";

export interface ContactListOptions {
  limit?: number;
}

/** Canonical contact fields shared by provider write adapters. */
export interface ContactWriteInput {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

/**
 * Provider boundary for Phase 1. Later phases add writes, synchronization jobs,
 * webhooks, and provider-specific capability declarations behind this contract.
 */
export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  readonly capabilities: {
    oauth: boolean;
    listContacts: boolean;
    updateContact: boolean;
    disconnect: boolean;
  };
  listContacts?(connection: IntegrationConnection, options?: ContactListOptions): Promise<NormalizedContact[]>;
  updateContact?(connection: IntegrationConnection, externalId: string, contact: ContactWriteInput): Promise<void>;
}

export type CrmAdapter = IntegrationAdapter;
