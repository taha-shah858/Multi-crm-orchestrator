import type { NormalizedContact } from "@/lib/models/contact";
import type { CrmProvider } from "@/lib/models/canonical";
import type { CrmConnection } from "@prisma/client";

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
export interface CrmAdapter {
  readonly provider: CrmProvider;
  listContacts(connection: CrmConnection, options?: ContactListOptions): Promise<NormalizedContact[]>;
  updateContact(connection: CrmConnection, externalId: string, contact: ContactWriteInput): Promise<void>;
}
