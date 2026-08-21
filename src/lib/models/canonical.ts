export const CRM_PROVIDERS = [
  "HUBSPOT",
  "SALESFORCE",
  "CLOSE",
  "GOHIGHLEVEL",
  "ACTIVECAMPAIGN",
  "ZOHO",
  "PIPEDRIVE",
] as const;

export type CrmProvider = (typeof CRM_PROVIDERS)[number];
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
