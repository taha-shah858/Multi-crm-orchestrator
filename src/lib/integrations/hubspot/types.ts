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
  associations?: HubSpotAssociations;
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

export interface HubSpotAssociationPage {
  results?: Array<{ id?: string; toObjectId?: number | string }>;
  paging?: { next?: { after: string } };
}

export type HubSpotAssociations = Record<string, HubSpotAssociationPage | undefined>;

export interface HubSpotObjectRecord {
  id: string;
  properties: Record<string, string | null | undefined>;
  associations?: HubSpotAssociations;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotObjectPage {
  results: HubSpotObjectRecord[];
  paging?: { next?: { after: string; link?: string } };
}

export interface HubSpotOwnerRecord {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userId?: number | null;
  teams?: Array<{ id: string }>;
  archived?: boolean;
}

export interface HubSpotOwnerPage {
  results: HubSpotOwnerRecord[];
  paging?: { next?: { after: string; link?: string } };
}

export interface HubSpotPipelineRecord {
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

export interface HubSpotPipelinePage {
  results: HubSpotPipelineRecord[];
}
