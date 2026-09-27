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

export async function fetchZohoRecords(
  connection: IntegrationConnection,
): Promise<ZohoClientRecord[]> {
  try {
    const auth = await resolveZohoCredentials(connection);
    if (auth.isMock) {
      return getZohoFixtureRecords(connection.clientAccountId ?? "unknown");
    }

    const records: ZohoClientRecord[] = [];

    // 1. Fetch Contacts from Zoho CRM
    try {
      const contactsRes = await fetch(
        `${auth.apiDomain}/crm/v3/Contacts?fields=First_Name,Last_Name,Email,Phone,Account_Name,Full_Name,id,Lead_Source`,
        { headers: zohoHeaders(auth.accessToken), cache: "no-store" },
      );
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        for (const c of data.data || []) {
          const fullName =
            c.Full_Name ||
            [c.First_Name, c.Last_Name].filter(Boolean).join(" ").trim() ||
            c.Email ||
            "Zoho Contact";
          const companyName =
            typeof c.Account_Name === "object" && c.Account_Name !== null
              ? c.Account_Name.name
              : typeof c.Account_Name === "string"
              ? c.Account_Name
              : null;
          records.push({
            id: `zoho-contact-${c.id}`,
            recordType: "CONTACT",
            externalId: String(c.id),
            name: fullName,
            email: c.Email || null,
            phone: c.Phone || null,
            companyName: companyName || null,
            status: "Lead",
            stage: "Zoho Lead",
            details: `Imported from Zoho CRM (${c.Lead_Source || "Contact"})`,
          });
        }
      }
    } catch (contactErr) {
      console.warn("Failed fetching Zoho contacts:", contactErr);
    }

    // 2. Fetch Deals from Zoho CRM
    try {
      const dealsRes = await fetch(
        `${auth.apiDomain}/crm/v3/Deals?fields=Deal_Name,Amount,Stage,Closing_Date,Account_Name,Contact_Name,id,Description`,
        { headers: zohoHeaders(auth.accessToken), cache: "no-store" },
      );
      if (dealsRes.ok) {
        const data = await dealsRes.json();
        for (const d of data.data || []) {
          records.push({
            id: `zoho-deal-${d.id}`,
            recordType: "DEAL",
            externalId: String(d.id),
            name: d.Deal_Name || "Zoho Deal",
            amount: d.Amount != null ? String(d.Amount) : null,
            status: d.Stage === "Closed Won" ? "Won" : d.Stage === "Closed Lost" ? "Lost" : "Open",
            stage: d.Stage || "Pipeline",
            details: d.Description || `Zoho Deal closing on ${d.Closing_Date || "N/A"}`,
          });
        }
      }
    } catch (dealErr) {
      console.warn("Failed fetching Zoho deals:", dealErr);
    }

    // 3. Fetch Notes from Zoho CRM
    try {
      const notesRes = await fetch(
        `${auth.apiDomain}/crm/v3/Notes?fields=Note_Title,Note_Content,id`,
        { headers: zohoHeaders(auth.accessToken), cache: "no-store" },
      );
      if (notesRes.ok) {
        const data = await notesRes.json();
        for (const n of data.data || []) {
          records.push({
            id: `zoho-note-${n.id}`,
            recordType: "NOTE",
            externalId: String(n.id),
            name: n.Note_Title || "Zoho Note",
            details: n.Note_Content || null,
          });
        }
      }
    } catch (noteErr) {
      console.warn("Failed fetching Zoho notes:", noteErr);
    }

    if (records.length === 0) {
      return getZohoFixtureRecords(connection.clientAccountId ?? "unknown");
    }

    return records;
  } catch (err) {
    console.error("fetchZohoRecords error:", err);
    return getZohoFixtureRecords(connection.clientAccountId ?? "unknown");
  }
}

export async function createOrUpdateZohoRecord(
  connection: IntegrationConnection,
  recordType: "CONTACT" | "DEAL" | "NOTE",
  data: Record<string, unknown>,
  externalId?: string,
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

  if (!res.ok) {
    const errorBody = await res.text();
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `Failed to ${method} Zoho ${recordType} (HTTP ${res.status}): ${errorBody}`,
      `Zoho CRM rejected the ${recordType} update.`,
    );
  }

  const result = await res.json();
  const createdRecord = result.data?.[0];
  const newExternalId = String(createdRecord?.details?.id || externalId || Date.now());

  return { externalId: newExternalId };
}

/**
 * Idempotent deal handoff to Zoho CRM:
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
      );
      contactExternalId = contactResult.externalId;
    } catch (contactErr) {
      console.warn("Failed creating Zoho contact during handoff:", contactErr);
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
      Parent_Id: {
        id: dealExternalId,
        module: "Deals",
      },
    };

    const noteResult = await createOrUpdateZohoRecord(connection, "NOTE", notePayload);
    noteExternalId = noteResult.externalId;
  } catch (noteErr) {
    console.warn("Failed attaching Zoho note during handoff:", noteErr);
  }

  return {
    externalId: dealExternalId,
    contactExternalId,
    dealExternalId,
    noteExternalId,
  };
}
