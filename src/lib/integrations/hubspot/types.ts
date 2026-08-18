/**
 * Raw HubSpot CRM v3 API TypeScript interfaces.
 * Reference: GET /crm/v3/objects/contacts
 */

export interface HubSpotContactProperties {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  createdate?: string | null;
  lastmodifieddate?: string | null;
  [key: string]: string | null | undefined;
}

export interface HubSpotContactRecord {
  id: string;
  properties: HubSpotContactProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotContactsApiResponse {
  results: HubSpotContactRecord[];
  paging?: {
    next?: {
      after: string;
      link?: string;
    };
  };
}
