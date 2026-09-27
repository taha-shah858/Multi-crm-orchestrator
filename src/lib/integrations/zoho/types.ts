import type { ClientRecordType } from "@prisma/client";

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiDomain: string; // e.g. "https://www.zohoapis.com"
  accountsUrl?: string; // e.g. "https://accounts.zoho.com"
}

export interface ZohoTokenResponse {
  access_token: string;
  refresh_token?: string;
  api_domain?: string;
  token_type?: string;
  expires_in: number; // in seconds
}

export interface ZohoClientRecord {
  id: string;
  recordType: ClientRecordType;
  externalId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  status?: string | null;
  stage?: string | null;
  amount?: string | null;
  details?: string | null;
}

export interface ZohoHandoffPayload {
  agencyDealId: string;
  clientAccountId: string;
  dealName: string;
  amountCents: number;
  currency: string;
  closeStatus: string;
  closeDate: string;
  closeOutcome?: string;
  recommendedNextAction?: string;
  agentName?: string;
  notes?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    agencyContactId?: string;
  };
}

export interface ZohoHandoffResult {
  externalId: string;
  contactExternalId?: string;
  dealExternalId?: string;
  noteExternalId?: string;
}
