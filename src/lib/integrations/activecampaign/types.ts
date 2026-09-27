export interface ActiveCampaignContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  orgname?: string | null;
}

export interface ActiveCampaignAccount {
  id: string;
  name: string;
  accountUrl?: string | null;
}

export interface ActiveCampaignDeal {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: number; // 0 = open, 1 = won, 2 = lost
  stage?: string | null;
  account?: string | null;
  contact?: string | null;
}

export interface ActiveCampaignNote {
  id: string;
  note: string;
  relid?: string | null;
  reltype?: string | null;
}

export interface ActiveCampaignHandoffPayload {
  agencyDealId: string;
  clientAccountId: string;
  dealName: string;
  amountCents: number;
  currency: string;
  closeStatus: string;
  closeDate: string;
  closeOutcome: string;
  recommendedNextAction: string;
  agentName?: string;
  notes?: string;
}

export interface ActiveCampaignClientRecord {
  id: string;
  recordType: "CONTACT" | "COMPANY" | "DEAL" | "ACTIVITY" | "NOTE" | "TASK";
  externalId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  status?: string | null;
  stage?: string | null;
  amount?: string | null;
  details?: string | null;
  customFields?: Record<string, unknown> | null;
}
