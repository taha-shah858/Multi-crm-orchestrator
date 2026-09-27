import type { NormalizedContact } from "@/lib/models/contact";
import type { IntegrationProvider } from "@/lib/models/canonical";
import type { IntegrationConnection } from "@prisma/client";

export interface ContactListOptions {
  limit?: number;
}

export type HubSpotSalesObjectType = "companies" | "deals" | "calls" | "meetings" | "notes" | "tasks" | "emails";

export interface ProviderAssociationSet {
  contacts: string[];
  companies: string[];
  deals: string[];
}

export interface ProviderSalesRecord {
  id: string;
  properties: Record<string, string | null | undefined>;
  associations: ProviderAssociationSet;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface ProviderOwnerRecord {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userId?: number | null;
  teams?: Array<{ id: string }>;
  archived?: boolean;
}

export interface ProviderPipelineRecord {
  id: string;
  label: string;
  displayOrder: number;
  archived?: boolean;
  stages: Array<{
    id: string;
    label: string;
    displayOrder: number;
    metadata?: { probability?: string; isClosed?: string };
    archived?: boolean;
  }>;
}

export interface SalesCrmSnapshot {
  contacts: NormalizedContact[];
  contactRecords: ProviderSalesRecord[];
  companies: ProviderSalesRecord[];
  deals: ProviderSalesRecord[];
  owners: ProviderOwnerRecord[];
  pipelines: ProviderPipelineRecord[];
  activities: Array<ProviderSalesRecord & { objectType: "CALL" | "MEETING" | "NOTE" | "TASK" | "EMAIL" }>;
  failures: Array<{ category: string; message: string }>;
}

/** Canonical contact fields shared by provider write adapters. */
export interface ContactWriteInput {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface CompanyWriteInput {
  name: string;
  domain: string | null;
  website: string | null;
  phone: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  address: string | null;
}

export interface DealWriteInput {
  name: string;
  amount: string;
  pipelineId: string | null;
  stageId: string | null;
  expectedCloseAt: Date | null;
  ownerExternalId: string | null;
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
    salesCrm: boolean;
    updateCompany: boolean;
    updateDeal: boolean;
    createDeal?: boolean;
    disconnect: boolean;
  };
  listContacts?(connection: IntegrationConnection, options?: ContactListOptions): Promise<NormalizedContact[]>;
  updateContact?(connection: IntegrationConnection, externalId: string, contact: ContactWriteInput): Promise<void>;
  fetchSalesCrm?(connection: IntegrationConnection): Promise<SalesCrmSnapshot>;
  updateCompany?(connection: IntegrationConnection, externalId: string, company: CompanyWriteInput): Promise<void>;
  updateDeal?(connection: IntegrationConnection, externalId: string, deal: DealWriteInput): Promise<void>;
  createDeal?(connection: IntegrationConnection, deal: DealWriteInput, contactExternalId?: string): Promise<{ id: string }>;
}

export type CrmAdapter = IntegrationAdapter;
