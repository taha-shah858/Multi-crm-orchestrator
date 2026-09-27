export const INTEGRATION_PROVIDERS = [
  "HUBSPOT",
  "MOCK",
  "SALESFORCE",
  "CLOSE",
  "GOHIGHLEVEL",
  "ACTIVECAMPAIGN",
  "ZOHO",
  "PIPEDRIVE",
  "TWILIO",
  "GOOGLE_CALENDAR",
  "OUTLOOK",
  "AI_PROVIDER",
  "CLICKUP",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
export type CrmProvider = Extract<IntegrationProvider, "HUBSPOT" | "MOCK" | "SALESFORCE" | "CLOSE" | "GOHIGHLEVEL" | "ACTIVECAMPAIGN" | "ZOHO" | "PIPEDRIVE">;
export type IntegrationOwnershipType = "COMPANY" | "CLIENT_ACCOUNT" | "USER";
export type UserRole = "ADMIN" | "MANAGER" | "AGENT";

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ClientAccountSummary {
  id: string;
  organizationId: string;
  name: string;
  brandName: string;
  communicationIdentity?: string;
}

export interface RequestContext {
  user: AuthenticatedUser;
  activeClientAccountId: string;
}

/**
 * Platform-owned identity. Provider IDs belong in an ExternalRecord mapping,
 * never in this model's `id` field.
 */
export interface CanonicalContact {
  id: string;
  organizationId: string;
  clientAccountId: string;
  assignedAgentId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmConnectionSummary {
  id: string;
  organizationId: string;
  clientAccountId: string;
  provider: CrmProvider;
  status:
    | "CONNECTED"
    | "DEGRADED"
    | "AUTHENTICATION_REQUIRED"
    | "ERROR"
    | "DISCONNECTED";
}

export interface IntegrationConnectionSummary {
  id: string;
  organizationId: string;
  ownershipType: IntegrationOwnershipType;
  clientAccountId: string | null;
  userId: string | null;
  provider: IntegrationProvider;
  providerAccountId: string | null;
  providerAccountName: string | null;
  status: "CONNECTED" | "DEGRADED" | "AUTHENTICATION_REQUIRED" | "ERROR" | "DISCONNECTED";
  scopes: string[];
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  clientAccount?: { id: string; name: string } | null;
  owner?: { id: string; name: string; email: string } | null;
  permissions: {
    canConnect: boolean;
    canDisconnect: boolean;
    canSync: boolean;
    canRetry: boolean;
    canManage: boolean;
  };
}

export type HandoffStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "RETRYING";
export type ClientRecordType = "CONTACT" | "COMPANY" | "DEAL" | "ACTIVITY" | "NOTE" | "TASK";

export interface DealHandoffSummary {
  id: string;
  agencyDealId: string;
  clientAccountId: string;
  agentId: string | null;
  dealName: string;
  dealAmountCents: number;
  currency: string;
  closeStatus: string;
  closeDate: string;
  closeOutcome: string | null;
  recommendedNextAction: string | null;
  notes: string | null;
  clientCrmProvider: IntegrationProvider;
  clientCrmRecordId: string | null;
  status: HandoffStatus;
  retryCount: number;
  lastAttemptedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  clientAccount?: { id: string; name: string } | null;
  agencyDeal?: { id: string; title: string; valueCents: number } | null;
  agent?: { id: string; name: string; email: string } | null;
}

export interface ClientCrmRecordSummary {
  id: string;
  organizationId: string;
  clientAccountId: string;
  connectionId: string | null;
  provider: IntegrationProvider;
  recordType: ClientRecordType;
  externalId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  status: string | null;
  stage: string | null;
  amount: string | null;
  details: string | null;
  customFields?: Record<string, unknown> | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
