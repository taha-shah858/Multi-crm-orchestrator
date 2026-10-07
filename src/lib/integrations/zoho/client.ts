import "server-only";

import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "@/lib/integrations/credential-crypto";
import { refreshZohoToken, ZOHO_DEFAULT_API_DOMAIN } from "./oauth";
import type {
  ZohoClientRecord,
  ZohoHandoffPayload,
  ZohoHandoffResult,
} from "./types";

interface ZohoAuthContext {
  accessToken: string;
  refreshToken?: string;
  apiDomain: string;
  isMock: boolean;
}

export async function resolveZohoCredentials(
  connection: IntegrationConnection,
): Promise<ZohoAuthContext> {
  const credential = await prisma.integrationCredential.findUnique({
    where: { integrationConnectionId: connection.id },
  });

  // Check environment fallback for tests/development
  if (!credential) {
    const envToken = process.env.ZOHO_ACCESS_TOKEN;
    const envRefresh = process.env.ZOHO_REFRESH_TOKEN;
    const envDomain = process.env.ZOHO_API_DOMAIN || ZOHO_DEFAULT_API_DOMAIN;
    if (envToken) {
      return {
        accessToken: envToken,
        refreshToken: envRefresh,
        apiDomain: envDomain,
        isMock: envToken.startsWith("mock") || envToken.startsWith("test"),
      };
    }
    throw new AppError(
      "CREDENTIAL_NOT_FOUND",
      404,
      "Zoho CRM credentials are missing.",
      "Connect Zoho CRM for this client account to continue.",
    );
  }

  let accessToken: string;
  let refreshToken: string | undefined;

  if (credential.encryptedAccessToken.startsWith("env:")) {
    const varName = credential.encryptedAccessToken.slice(4);
    accessToken = process.env[varName] || "";
  } else {
    accessToken = decryptIntegrationSecret(credential.encryptedAccessToken);
  }

  if (credential.encryptedRefreshToken) {
    if (credential.encryptedRefreshToken.startsWith("env:")) {
      const varName = credential.encryptedRefreshToken.slice(4);
      refreshToken = process.env[varName] || undefined;
    } else {
      refreshToken = decryptIntegrationSecret(credential.encryptedRefreshToken);
    }
  }

  const meta = credential.metadata as { apiDomain?: string } | null;
  const apiDomain = meta?.apiDomain || process.env.ZOHO_API_DOMAIN || ZOHO_DEFAULT_API_DOMAIN;
  const isMock =
    accessToken.startsWith("mock") ||
    accessToken.startsWith("test") ||
    (refreshToken ? refreshToken.startsWith("mock") || refreshToken.startsWith("test") : false) ||
    apiDomain.includes("localhost") ||
    apiDomain.includes(".test");

  // Check if access token is expired or about to expire in 60s
  const now = Date.now();
  if (
    !isMock &&
    credential.accessTokenExpiresAt &&
    credential.accessTokenExpiresAt.getTime() - now < 60000 &&
    refreshToken
  ) {
    try {
      const refreshed = await refreshZohoToken(refreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(now + refreshed.expires_in * 1000);

      await prisma.integrationCredential.update({
        where: { integrationConnectionId: connection.id },
        data: {
          encryptedAccessToken: encryptIntegrationSecret(refreshed.access_token),
          accessTokenExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        },
      });
    } catch (refreshErr) {
      console.warn("Zoho token auto-refresh failed:", refreshErr);
    }
  }

  return {
    accessToken,
    refreshToken,
    apiDomain: apiDomain.replace(/\/+$/, ""),
    isMock,
  };
}

function zohoHeaders(accessToken: string) {
  return {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Deterministic fixture records for testing and offline development
 */
function getZohoFixtureRecords(clientAccountId: string): ZohoClientRecord[] {
  return [
    {
      id: `zoho-contact-1-${clientAccountId}`,
      recordType: "CONTACT",
      externalId: `zh-cnt-101`,
      name: "Marcus Vance",
      email: "marcus.vance@example.com",
      phone: "+1 555-019-2831",
      companyName: "Vance Technologies",
      status: "Active Customer",
      stage: "Onboarding",
      details: "Client operations contact in Zoho CRM",
    },
    {
      id: `zoho-contact-2-${clientAccountId}`,
      recordType: "CONTACT",
      externalId: `zh-cnt-102`,
      name: "Elena Rostova",
      email: "elena@rostovacapital.com",
      phone: "+1 555-014-9921",
      companyName: "Rostova Capital",
      status: "Lead",
      stage: "Qualification",
      details: "Inbound prospective client",
    },
    {
      id: `zoho-deal-1-${clientAccountId}`,
      recordType: "DEAL",
      externalId: `zh-deal-201`,
      name: "Vance Cloud Migration Contract",
      amount: "48000.00",
      status: "Won",
      stage: "Closed Won",
      details: "Closed agency deal handed off to client operations",
    },
    {
      id: `zoho-note-1-${clientAccountId}`,
      recordType: "NOTE",
      externalId: `zh-note-301`,
      name: "Onboarding Kickoff Notes",
      details: "Customer accepted terms. Recommended next action: schedule technical onboarding call with client team.",
    },
  ];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function providerRecordId(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho did not return a valid record ID.", "Zoho did not confirm a valid record identifier.");
}

async function fetchZohoModule(auth: ZohoAuthContext, module: string, fields: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(auth.apiDomain + "/crm/v3/" + module + "?fields=" + fields, {
    headers: zohoHeaders(auth.accessToken), cache: "no-store",
  });
  if (response.status === 204) return [];
  if (!response.ok) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho " + module + " import failed (HTTP " + response.status + ").", "Zoho could not import records. Check the connection and permissions.");
  }
  const payload = objectValue(await response.json());
  if (!Array.isArray(payload.data)) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Invalid Zoho " + module + " response.", "Zoho returned an invalid record response.");
  }
  return payload.data.map((item: unknown) => {
    const record = objectValue(item);
    return { ...record, id: providerRecordId(record.id) };
  });
}

export async function fetchZohoRecords(connection: IntegrationConnection): Promise<ZohoClientRecord[]> {
  const auth = await resolveZohoCredentials(connection);
  // Only explicit mock credentials use fixtures; live errors and empty results never do.
  if (auth.isMock) return getZohoFixtureRecords(connection.clientAccountId ?? "unknown");
  const records: ZohoClientRecord[] = [];
  const contacts = await fetchZohoModule(auth, "Contacts", "First_Name,Last_Name,Email,Phone,Account_Name,Full_Name,id,Lead_Source");
  for (const contact of contacts) {
    const account = objectValue(contact.Account_Name);
    records.push({
      id: "zoho-contact-" + contact.id, recordType: "CONTACT", externalId: String(contact.id),
      name: textValue(contact.Full_Name) || [textValue(contact.First_Name), textValue(contact.Last_Name)].filter(Boolean).join(" ").trim() || textValue(contact.Email) || "Zoho Contact",
      email: textValue(contact.Email), phone: textValue(contact.Phone),
      companyName: textValue(account.name) || textValue(contact.Account_Name),
      status: "Lead", stage: "Zoho Lead", details: "Imported from Zoho CRM",
    });
  }
  const deals = await fetchZohoModule(auth, "Deals", "Deal_Name,Amount,Stage,Closing_Date,Account_Name,Contact_Name,id,Description");
  for (const deal of deals) {
    records.push({
      id: "zoho-deal-" + deal.id, recordType: "DEAL", externalId: String(deal.id),
      name: textValue(deal.Deal_Name) || "Zoho Deal",
      amount: deal.Amount != null ? String(deal.Amount) : null,
      status: deal.Stage === "Closed Won" ? "Won" : deal.Stage === "Closed Lost" ? "Lost" : "Open",
      stage: textValue(deal.Stage) || "Pipeline", details: textValue(deal.Description),
    });
  }
  const notes = await fetchZohoModule(auth, "Notes", "Note_Title,Note_Content,id");
  for (const note of notes) {
    records.push({
      id: "zoho-note-" + note.id, recordType: "NOTE", externalId: String(note.id),
      name: textValue(note.Note_Title) || "Zoho Note", details: textValue(note.Note_Content),
    });
  }
  return records;
}

export async function createOrUpdateZohoRecord(
  connection: IntegrationConnection,
  recordType: "CONTACT" | "DEAL" | "NOTE",
  data: Record<string, unknown>,
  externalId?: string,
  reuseExistingEmailContact = false,
): Promise<{ externalId: string }> {
  const auth = await resolveZohoCredentials(connection);

  if (auth.isMock) {
    const generatedId = externalId || `zoho-${recordType.toLowerCase()}-${Date.now()}`;
    return { externalId: generatedId };
  }

  const endpoint =
    recordType === "CONTACT" ? "Contacts" : recordType === "DEAL" ? "Deals" : "Notes";
  const url = externalId
    ? `${auth.apiDomain}/crm/v3/${endpoint}/${externalId}`
    : `${auth.apiDomain}/crm/v3/${endpoint}`;
  const method = externalId ? "PUT" : "POST";

  const payload = {
    data: [data],
  };

  const res = await fetch(url, {
    method,
    headers: zohoHeaders(auth.accessToken),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const responseBody = await res.text();
  let result: Record<string, unknown> = {};
  try { result = objectValue(JSON.parse(responseBody)); } catch { /* Invalid provider responses remain failures. */ }
  const createdRecord = objectValue(Array.isArray(result.data) ? result.data[0] : null);
  const duplicateDetails = objectValue(createdRecord.details);
  const duplicateRecord = objectValue(duplicateDetails.duplicate_record);
  // Only handoff contact creation may reuse an exact email duplicate. Do not
  // overwrite existing client contact fields or treat unrelated errors as success.
  if (reuseExistingEmailContact && !externalId && recordType === "CONTACT" &&
      (res.ok || res.status === 400) && createdRecord.code === "DUPLICATE_DATA" &&
      createdRecord.status === "error" && duplicateDetails.api_name === "Email" &&
      objectValue(duplicateRecord.module).api_name === "Contacts" &&
      duplicateDetails.more_records !== true && typeof data.Email === "string" && data.Email.trim()) {
    const duplicateId = providerRecordId(duplicateRecord.id);
    const existingResponse = await fetch(`${auth.apiDomain}/crm/v3/Contacts/${encodeURIComponent(duplicateId)}?fields=Email`, {
      headers: zohoHeaders(auth.accessToken), cache: "no-store",
    });
    if (!existingResponse.ok) {
      throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho duplicate contact could not be verified.", "Zoho could not confirm the existing contact. Retry the handoff.");
    }
    const existingPayload = objectValue(await existingResponse.json());
    const existing = objectValue(Array.isArray(existingPayload.data) ? existingPayload.data[0] : null);
    if (providerRecordId(existing.id) !== duplicateId || typeof existing.Email !== "string" ||
        existing.Email.trim().toLowerCase() !== data.Email.trim().toLowerCase()) {
      throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho duplicate contact email did not match.", "Zoho could not confirm a matching contact. Review the contact before retrying.");
    }
    return { externalId: duplicateId };
  }
  if (!res.ok) {
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `Failed to ${method} Zoho ${recordType} (HTTP ${res.status}): ${responseBody}`,
      `Zoho CRM rejected the ${recordType} update.`,
    );
  }

  if (createdRecord.status !== "success" || createdRecord.code !== "SUCCESS") {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho rejected the record update.", "Zoho rejected the record update. The local edit was retained.");
  }
  const confirmedId = providerRecordId(objectValue(createdRecord.details).id);
  if (externalId && confirmedId !== externalId) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Zoho confirmed a different record identifier.", "Zoho did not confirm the requested record update.");
  }
  return { externalId: confirmedId };
}

/**
 * Closed-deal handoff to Zoho CRM. Durable recovery of partial creates is a
 * separate sync concern; deterministic mock IDs do not prove live idempotency.
 * 1. Creates/updates Contact in Zoho CRM
 * 2. Creates/updates Deal in Zoho CRM
 * 3. Attaches Note with handoff context, close reason, agent, and next action
 */
export async function syncHandoffToZoho(
  connection: IntegrationConnection,
  payload: ZohoHandoffPayload,
): Promise<ZohoHandoffResult> {
  const auth = await resolveZohoCredentials(connection);

  if (auth.isMock) {
    const safeDealId = payload.agencyDealId.replace(/[^a-zA-Z0-9_-]/g, "");
    return {
      externalId: `zh-deal-${safeDealId}`,
      contactExternalId: `zh-cnt-${safeDealId}`,
      dealExternalId: `zh-deal-${safeDealId}`,
      noteExternalId: `zh-note-${safeDealId}`,
    };
  }

  // 1. Create or update Contact in Zoho CRM
  let contactExternalId: string | undefined;
  if (payload.customer?.email || payload.customer?.lastName) {
    try {
      const contactPayload: Record<string, unknown> = {
        First_Name: payload.customer.firstName || "",
        Last_Name: payload.customer.lastName || "Customer",
        Email: payload.customer.email,
        Phone: payload.customer.phone,
        Lead_Source: "Agency Deal Handoff",
        Description: `Handoff from Agency Deal: ${payload.dealName}`,
      };
      const contactResult = await createOrUpdateZohoRecord(
        connection,
        "CONTACT",
        contactPayload,
        undefined,
        true,
      );
      contactExternalId = contactResult.externalId;
    } catch (contactErr) {
      console.warn("Failed creating Zoho contact during handoff:", contactErr);
      throw contactErr;
    }
  }

  // 2. Create or update Deal in Zoho CRM
  const dealAmount = (payload.amountCents / 100).toFixed(2);
  const dealPayload: Record<string, unknown> = {
    Deal_Name: payload.dealName,
    Amount: parseFloat(dealAmount),
    Stage: "Closed Won",
    Closing_Date: payload.closeDate.slice(0, 10),
    Lead_Source: "Agency Deal Handoff",
    Description: [
      `Agency Deal ID: ${payload.agencyDealId}`,
      `Closed By: ${payload.agentName || "Sales Agent"}`,
      `Outcome: ${payload.closeOutcome || "Client accepted proposal"}`,
      `Recommended Next Action: ${payload.recommendedNextAction || "Begin onboarding"}`,
      payload.notes ? `Handoff Notes: ${payload.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    ...(contactExternalId ? { Contact_Name: { id: contactExternalId } } : {}),
  };

  const dealResult = await createOrUpdateZohoRecord(connection, "DEAL", dealPayload);
  const dealExternalId = dealResult.externalId;

  // 3. Attach Note to the Deal in Zoho CRM
  let noteExternalId: string | undefined;
  try {
    const notePayload: Record<string, unknown> = {
      Note_Title: `Deal Handoff: ${payload.dealName}`,
      Note_Content: [
        `=== DEAL HANDOFF DETAILS ===`,
        `Deal: ${payload.dealName}`,
        `Amount: $${dealAmount} ${payload.currency}`,
        `Closed By Agent: ${payload.agentName || "Sales Agent"}`,
        `Close Outcome: ${payload.closeOutcome || "Client accepted proposal"}`,
        `What The Client Should Do Next: ${payload.recommendedNextAction || "Begin onboarding"}`,
        payload.notes ? `Special Notes: ${payload.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      Parent_Id: dealExternalId,
      $se_module: "Deals",
    };

    const noteResult = await createOrUpdateZohoRecord(connection, "NOTE", notePayload);
    noteExternalId = noteResult.externalId;
  } catch (noteErr) {
    console.warn("Failed attaching Zoho note during handoff:", noteErr);
    throw noteErr;
  }

  return {
    externalId: dealExternalId,
    contactExternalId,
    dealExternalId,
    noteExternalId,
  };
}
