/**
 * Canonical normalized contact model for the Multi-CRM Orchestrator.
 * All CRM-specific providers (HubSpot, Salesforce, Zoho, etc.) map to this common representation.
 */
export interface NormalizedContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  source_crm: "HubSpot" | "Salesforce" | "Zoho" | "Pipedrive";
  raw_created_at?: string;
  raw_updated_at?: string;
}
