import type { NormalizedContact } from "@/lib/models/contact";
import type { CrmProvider } from "@/lib/models/canonical";

export interface ContactListOptions {
  limit?: number;
}

/**
 * Provider boundary for Phase 1. Later phases add writes, synchronization jobs,
 * webhooks, and provider-specific capability declarations behind this contract.
 */
export interface CrmAdapter {
  readonly provider: CrmProvider;
  listContacts(options?: ContactListOptions): Promise<NormalizedContact[]>;
}
