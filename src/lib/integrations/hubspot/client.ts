import type { IntegrationConnection } from "@prisma/client";
import type {
  CompanyWriteInput,
  DealWriteInput,
  ProviderAssociationSet,
  ProviderSalesRecord,
  SalesCrmSnapshot,
  HubSpotSalesObjectType,
  ContactWriteInput,
} from "@/lib/integrations/types";
import { AppError } from "@/lib/errors/app-error";
import { getValidHubSpotAccessToken } from "@/lib/integrations/hubspot/oauth";
import { mapHubSpotContactToNormalized } from "./mapper";
import type {
  HubSpotAssociations,
  HubSpotContactsApiResponse,
  HubSpotObjectPage,
  HubSpotObjectRecord,
  HubSpotOwnerPage,
  HubSpotPipelinePage,
} from "./types";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const MAX_PAGES = 1_000;
const MAX_RETRIES = 3;

const properties: Record<HubSpotSalesObjectType | "contacts", string[]> = {
  contacts: ["firstname", "lastname", "email", "phone", "company", "hubspot_owner_id", "createdate", "lastmodifieddate"],
  companies: ["name", "domain", "website", "phone", "industry", "city", "state", "country", "address", "hubspot_owner_id", "createdate", "hs_lastmodifieddate"],
  deals: ["dealname", "amount", "hs_currency_code", "pipeline", "dealstage", "closedate", "hs_closed_won_date", "hs_closed_lost_date", "hubspot_owner_id", "hs_is_closed", "hs_is_closed_won", "createdate", "hs_lastmodifieddate"],
  calls: ["hs_timestamp", "hs_call_title", "hs_call_body", "hs_call_direction", "hs_call_status", "hubspot_owner_id"],
  meetings: ["hs_timestamp", "hs_meeting_title", "hs_meeting_body", "hs_meeting_start_time", "hs_meeting_end_time", "hubspot_owner_id"],
  notes: ["hs_timestamp", "hs_note_body", "hubspot_owner_id"],
  tasks: ["hs_timestamp", "hs_task_subject", "hs_task_body", "hs_task_status", "hs_task_priority", "hubspot_owner_id"],
  emails: ["hs_timestamp", "hs_email_subject", "hs_email_text", "hs_email_direction", "hs_email_status", "hubspot_owner_id"],
};

function hubSpotHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function hubSpotRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
      ...init,
      headers: { ...hubSpotHeaders(token), ...(init.headers ?? {}) },
      cache: "no-store",
    });
    if (response.ok) {
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    }
    if (response.status !== 429 && response.status < 500) break;
    if (attempt < MAX_RETRIES - 1) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfterSeconds)
        ? Math.min(retryAfterSeconds * 1_000, 5_000)
        : Math.min(500 * 2 ** attempt, 2_000);
      await wait(delay);
    }
  }

  const status = response?.status ?? 502;
  if (status === 401) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "HubSpot authentication failed.", "HubSpot authentication needs attention. Reconnect the client account.");
  }
  if (status === 403) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "HubSpot rejected the requested sales CRM scope.", "HubSpot is missing a required CRM permission. Update the app scopes and reconnect the client account.");
  }
  if (status === 429) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 503, "HubSpot rate limit remained active after bounded retries.", "HubSpot is rate limiting synchronization. Wait briefly and retry.");
  }
  throw new AppError("EXTERNAL_SERVICE_ERROR", 502, `HubSpot API request failed with HTTP ${status}.`, "HubSpot could not complete the request. Your local data is unchanged; retry later.");
}

function associationIds(associations: HubSpotAssociations | undefined, key: string): string[] {
  return (associations?.[key]?.results ?? [])
    .map((item) => item.id ?? item.toObjectId)
    .filter((id): id is string | number => id !== undefined && id !== null)
    .map(String);
}

function normalizeRecord(record: HubSpotObjectRecord): ProviderSalesRecord {
  const associations: ProviderAssociationSet = {
    contacts: associationIds(record.associations, "contacts"),
    companies: associationIds(record.associations, "companies"),
    deals: associationIds(record.associations, "deals"),
  };
  return { ...record, associations };
}

async function fetchAllObjects(
  token: string,
  objectType: HubSpotSalesObjectType | "contacts",
  associationTypes: string[] = [],
  pageSize = 100,
): Promise<ProviderSalesRecord[]> {
  const all: ProviderSalesRecord[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(`${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}`);
    url.searchParams.set("limit", String(Math.max(1, Math.min(100, pageSize))));
    url.searchParams.set("properties", properties[objectType].join(","));
    if (associationTypes.length) url.searchParams.set("associations", associationTypes.join(","));
    if (after) url.searchParams.set("after", after);
    const payload = await hubSpotRequest<HubSpotObjectPage>(token, `${url.pathname}${url.search}`);
    all.push(...payload.results.map(normalizeRecord));
    after = payload.paging?.next?.after;
    if (!after) return all;
  }
  throw new AppError("EXTERNAL_SERVICE_ERROR", 502, `HubSpot ${objectType} pagination exceeded the safety limit.`, `HubSpot returned too many ${objectType} pages. Narrow the account data or contact support.`);
}

export async function fetchHubSpotContacts(connection: IntegrationConnection, limit = 100): Promise<HubSpotContactsApiResponse> {
  const token = await getValidHubSpotAccessToken(connection);
  const records = await fetchAllObjects(token, "contacts", ["companies", "deals"], limit);
  return { results: records.map((record) => ({ id: record.id, properties: record.properties, createdAt: record.createdAt, updatedAt: record.updatedAt, archived: record.archived })) };
}

export async function fetchHubSpotSalesCrm(connection: IntegrationConnection): Promise<SalesCrmSnapshot> {
  const token = await getValidHubSpotAccessToken(connection);
  const requests = [
    ["contacts", fetchAllObjects(token, "contacts", ["companies", "deals"])],
    ["companies", fetchAllObjects(token, "companies", ["contacts", "deals"])],
    ["deals", fetchAllObjects(token, "deals", ["contacts", "companies"])],
    ["owners", fetchAllOwners(token)],
    ["pipelines", hubSpotRequest<HubSpotPipelinePage>(token, "/crm/v3/pipelines/deals")],
    ["calls", fetchAllObjects(token, "calls", ["contacts", "companies", "deals"])],
    ["meetings", fetchAllObjects(token, "meetings", ["contacts", "companies", "deals"])],
    ["notes", fetchAllObjects(token, "notes", ["contacts", "companies", "deals"])],
    ["tasks", fetchAllObjects(token, "tasks", ["contacts", "companies", "deals"])],
    ["emails", fetchAllObjects(token, "emails", ["contacts", "companies", "deals"])],
  ] as const;
  const settled = await Promise.allSettled(requests.map(([, request]) => request));
  const failures: SalesCrmSnapshot["failures"] = [];
  const value = <T>(index: number, fallback: T): T => {
    const result = settled[index];
    if (result.status === "fulfilled") return result.value as T;
    failures.push({ category: requests[index][0], message: result.reason instanceof AppError ? result.reason.safeMessage : "HubSpot could not synchronize this category." });
    return fallback;
  };
  const contactRecords = value<ProviderSalesRecord[]>(0, []);
  const companies = value<ProviderSalesRecord[]>(1, []);
  const deals = value<ProviderSalesRecord[]>(2, []);
  const ownersPayload = value<SalesCrmSnapshot["owners"]>(3, []);
  const pipelinesPayload = value<HubSpotPipelinePage>(4, { results: [] });
  const calls = value<ProviderSalesRecord[]>(5, []);
  const meetings = value<ProviderSalesRecord[]>(6, []);
  const notes = value<ProviderSalesRecord[]>(7, []);
  const tasks = value<ProviderSalesRecord[]>(8, []);
  const emails = value<ProviderSalesRecord[]>(9, []);

  return {
    contacts: contactRecords.map((record) => mapHubSpotContactToNormalized(record)),
    contactRecords,
    companies,
    deals,
    owners: ownersPayload,
    pipelines: pipelinesPayload.results,
    activities: [
      ...calls.map((record) => ({ ...record, objectType: "CALL" as const })),
      ...meetings.map((record) => ({ ...record, objectType: "MEETING" as const })),
      ...notes.map((record) => ({ ...record, objectType: "NOTE" as const })),
      ...tasks.map((record) => ({ ...record, objectType: "TASK" as const })),
      ...emails.map((record) => ({ ...record, objectType: "EMAIL" as const })),
    ],
    failures,
  };
}

async function fetchAllOwners(token: string) {
  const all: HubSpotOwnerPage["results"] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ limit: "500" });
    if (after) query.set("after", after);
    const payload = await hubSpotRequest<HubSpotOwnerPage>(token, `/crm/v3/owners?${query}`);
    all.push(...payload.results);
    after = payload.paging?.next?.after;
    if (!after) return all;
  }
  throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "HubSpot owner pagination exceeded the safety limit.", "HubSpot returned too many owner pages. Contact support.");
}

async function patchObject(connection: IntegrationConnection, objectType: "contacts" | "companies" | "deals", externalId: string, values: Record<string, string>) {
  const token = await getValidHubSpotAccessToken(connection);
  await hubSpotRequest(token, `/crm/v3/objects/${objectType}/${encodeURIComponent(externalId)}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: values }),
  });
}

export function updateHubSpotContact(connection: IntegrationConnection, contactId: string, contact: ContactWriteInput) {
  return patchObject(connection, "contacts", contactId, {
    firstname: contact.firstName,
    lastname: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
  });
}

export function updateHubSpotCompany(connection: IntegrationConnection, companyId: string, company: CompanyWriteInput) {
  return patchObject(connection, "companies", companyId, {
    name: company.name,
    domain: company.domain ?? "",
    website: company.website ?? "",
    phone: company.phone ?? "",
    industry: company.industry ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    country: company.country ?? "",
    address: company.address ?? "",
  });
}

export function updateHubSpotDeal(connection: IntegrationConnection, dealId: string, deal: DealWriteInput) {
  const values: Record<string, string> = { dealname: deal.name, amount: deal.amount };
  if (deal.pipelineId) values.pipeline = deal.pipelineId;
  if (deal.stageId) values.dealstage = deal.stageId;
  if (deal.expectedCloseAt) values.closedate = deal.expectedCloseAt.toISOString();
  if (deal.ownerExternalId) values.hubspot_owner_id = deal.ownerExternalId;
  return patchObject(connection, "deals", dealId, values);
}

export async function createHubSpotDeal(
  connection: IntegrationConnection,
  deal: DealWriteInput,
  contactExternalId?: string,
): Promise<{ id: string }> {
  const token = await getValidHubSpotAccessToken(connection);
  const values: Record<string, string> = { dealname: deal.name, amount: deal.amount };
  if (deal.pipelineId) values.pipeline = deal.pipelineId;
  if (deal.stageId) values.dealstage = deal.stageId;
  if (deal.expectedCloseAt) values.closedate = deal.expectedCloseAt.toISOString();
  if (deal.ownerExternalId) values.hubspot_owner_id = deal.ownerExternalId;

  const payload: {
    properties: Record<string, string>;
    associations?: Array<{
      to: { id: string };
      types: Array<{ associationCategory: string; associationTypeId: number }>;
    }>;
  } = { properties: values };

  if (contactExternalId) {
    payload.associations = [
      {
        to: { id: contactExternalId },
        types: [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 3, // deal_to_contact
          },
        ],
      },
    ];
  }

  const response = await hubSpotRequest<{ id: string }>(token, "/crm/v3/objects/deals", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return { id: response.id };
}
