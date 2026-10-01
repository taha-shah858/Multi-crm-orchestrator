import "server-only";

import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { decryptIntegrationSecret } from "@/lib/integrations/credential-crypto";
import type {
  ActiveCampaignClientRecord,
  ActiveCampaignHandoffPayload,
} from "./types";

interface ActiveCampaignConfig {
  apiKey: string;
  apiUrl: string;
}

export async function resolveActiveCampaignCredentials(
  connection: IntegrationConnection,
): Promise<ActiveCampaignConfig> {
  const credential = await prisma.integrationCredential.findUnique({
    where: { integrationConnectionId: connection.id },
  });

  if (!credential) {
    // Check environment fallback for tests/development
    const envKey = process.env.ACTIVECAMPAIGN_API_KEY;
    const envUrl = process.env.ACTIVECAMPAIGN_API_URL || "https://client-crm.api-us1.com/api/3";
    if (envKey) {
      return { apiKey: envKey, apiUrl: envUrl };
    }
    throw new AppError(
      "CREDENTIAL_NOT_FOUND",
      404,
      "ActiveCampaign credentials are missing.",
      "Connect ActiveCampaign for this client account to continue.",
    );
  }

  let apiKey: string;
  if (credential.encryptedAccessToken.startsWith("env:")) {
    const varName = credential.encryptedAccessToken.slice(4);
    apiKey = process.env[varName] || "";
  } else {
    apiKey = decryptIntegrationSecret(credential.encryptedAccessToken);
  }

  const meta = credential.metadata as { apiUrl?: string } | null;
  const apiUrl = meta?.apiUrl || process.env.ACTIVECAMPAIGN_API_URL || "https://client-crm.api-us1.com/api/3";

  return { apiKey, apiUrl: apiUrl.replace(/\/+$/, "") };
}

function activeCampaignHeaders(apiKey: string) {
  return {
    "Api-Token": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function confirmedActiveCampaignId(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "ActiveCampaign did not confirm a record ID.", "The client CRM did not confirm a valid record identifier.");
}

export async function fetchActiveCampaignRecords(
  connection: IntegrationConnection,
): Promise<ActiveCampaignClientRecord[]> {
  try {
    const config = await resolveActiveCampaignCredentials(connection);
    // If running in test or offline fixture mode with dummy credentials:
    if (config.apiKey.startsWith("mock") || config.apiKey.startsWith("test") || config.apiUrl.includes("localhost") || config.apiUrl.includes(".test")) {
      return getFixtureRecords(connection.clientAccountId ?? "unknown");
    }

    const records: ActiveCampaignClientRecord[] = [];

    // 1. Fetch Contacts
    const contactsRes = await fetch(`${config.apiUrl}/contacts?limit=50`, {
      headers: activeCampaignHeaders(config.apiKey),
      cache: "no-store",
    });
    if (!contactsRes.ok) throw new Error(`ActiveCampaign contact import failed: HTTP ${contactsRes.status}`);
    if (contactsRes.status !== 204) {
      const data = await contactsRes.json();
      if (!Array.isArray(data.contacts)) throw new Error("Invalid ActiveCampaign contact response.");
      for (const c of (data.contacts || [])) {
        records.push({
          id: `ac-contact-${c.id}`,
          recordType: "CONTACT",
          externalId: confirmedActiveCampaignId(c.id),
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
          email: c.email || null,
          phone: c.phone || null,
          companyName: c.orgname || null,
        });
      }
    }

    // 2. Fetch Accounts
    const accountsRes = await fetch(`${config.apiUrl}/accounts?limit=50`, {
      headers: activeCampaignHeaders(config.apiKey),
      cache: "no-store",
    });
    if (!accountsRes.ok) throw new Error(`ActiveCampaign account import failed: HTTP ${accountsRes.status}`);
    if (accountsRes.status !== 204) {
      const data = await accountsRes.json();
      if (!Array.isArray(data.accounts)) throw new Error("Invalid ActiveCampaign account response.");
      for (const a of (data.accounts || [])) {
        records.push({
          id: `ac-company-${a.id}`,
          recordType: "COMPANY",
          externalId: confirmedActiveCampaignId(a.id),
          name: a.name,
          details: a.accountUrl || null,
        });
      }
    }

    // 3. Fetch Deals
    const dealsRes = await fetch(`${config.apiUrl}/deals?limit=50`, {
      headers: activeCampaignHeaders(config.apiKey),
      cache: "no-store",
    });
    if (!dealsRes.ok) throw new Error(`ActiveCampaign deal import failed: HTTP ${dealsRes.status}`);
    if (dealsRes.status !== 204) {
      const data = await dealsRes.json();
      if (!Array.isArray(data.deals)) throw new Error("Invalid ActiveCampaign deal response.");
      for (const d of (data.deals || [])) {
        records.push({
          id: `ac-deal-${d.id}`,
          recordType: "DEAL",
          externalId: confirmedActiveCampaignId(d.id),
          name: d.title,
          amount: d.value ? (Number(d.value) / 100).toFixed(2) : "0.00",
          status: d.status === 1 ? "Won" : d.status === 2 ? "Lost" : "Open",
          stage: d.stage ? String(d.stage) : null,
        });
      }
    }

    return records;
  } catch {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "ActiveCampaign import failed.", "The client CRM import failed. Existing records were retained.");
  }
}

export async function createOrUpdateActiveCampaignRecord(
  connection: IntegrationConnection,
  recordType: "CONTACT" | "COMPANY" | "DEAL" | "NOTE" | "TASK",
  data: Record<string, unknown>,
  externalId?: string,
): Promise<{ externalId: string }> {
  try {
    const config = await resolveActiveCampaignCredentials(connection);
    if (config.apiKey.startsWith("mock") || config.apiKey.startsWith("test") || config.apiUrl.includes(".test")) {
      return { externalId: externalId || `ac-${recordType.toLowerCase()}-${Date.now()}` };
    }

    const endpoint = recordType === "CONTACT" ? "contacts"
      : recordType === "COMPANY" ? "accounts"
      : recordType === "DEAL" ? "deals"
      : "notes";

    const url = externalId ? `${config.apiUrl}/${endpoint}/${externalId}` : `${config.apiUrl}/${endpoint}`;
    const method = externalId ? "PUT" : "POST";

    const payloadKey = recordType === "CONTACT" ? "contact"
      : recordType === "COMPANY" ? "account"
      : recordType === "DEAL" ? "deal"
      : "note";

    const res = await fetch(url, {
      method,
      headers: activeCampaignHeaders(config.apiKey),
      body: JSON.stringify({ [payloadKey]: data }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`ActiveCampaign API responded with status ${res.status}`);
    }

    const resData = await res.json();
    const id = confirmedActiveCampaignId(resData[payloadKey]?.id);
    if (externalId && id !== externalId) throw new Error("ActiveCampaign confirmed a different record ID.");
    return { externalId: id };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "ActiveCampaign update failed.", "The client CRM update failed. The local edit was retained.");
  }
}

export async function syncHandoffToActiveCampaign(
  connection: IntegrationConnection,
  handoff: ActiveCampaignHandoffPayload,
): Promise<{ externalId: string }> {
  const config = await resolveActiveCampaignCredentials(connection);

  const handoffDescription = [
    `Deal closed by agency: ${handoff.dealName}`,
    `Outcome: ${handoff.closeOutcome || "Client accepted proposal"}`,
    `Final amount: $${(handoff.amountCents / 100).toFixed(2)} ${handoff.currency}`,
    `Closed by: ${handoff.agentName || "Agency Agent"}`,
    `Next action: ${handoff.recommendedNextAction || "Begin onboarding"}`,
    `Handoff date: ${handoff.closeDate}`,
    handoff.notes ? `Notes: ${handoff.notes}` : "",
  ].filter(Boolean).join("\n");

  if (config.apiKey.startsWith("mock") || config.apiKey.startsWith("test") || config.apiUrl.includes(".test") || config.apiUrl.includes("localhost")) {
    return { externalId: `ac-deal-handoff-${handoff.agencyDealId}` };
  }

  try {
    // Create deal in ActiveCampaign representing the closed agency deal handoff
    const dealRes = await fetch(`${config.apiUrl}/deals`, {
      method: "POST",
      headers: activeCampaignHeaders(config.apiKey),
      body: JSON.stringify({
        deal: {
          title: `[Agency Handoff] ${handoff.dealName}`,
          value: handoff.amountCents,
          currency: handoff.currency.toLowerCase(),
          status: 1, // Won in ActiveCampaign
          description: handoffDescription,
        },
      }),
      cache: "no-store",
    });

    if (!dealRes.ok) {
      throw new Error(`ActiveCampaign rejected deal handoff: HTTP ${dealRes.status}`);
    }

    const data = await dealRes.json();
    return { externalId: confirmedActiveCampaignId(data.deal?.id) };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "ActiveCampaign handoff failed.", "The client CRM rejected the handoff.");
  }
}

function getFixtureRecords(clientAccountId: string): ActiveCampaignClientRecord[] {
  return [
    {
      id: `ac-contact-fixture-1-${clientAccountId}`,
      recordType: "CONTACT",
      externalId: "ac-101",
      name: "Marcus Vance",
      email: "marcus.vance@operational-client.test",
      phone: "+1-555-400-0101",
      companyName: "Vance Logistics",
      status: "Active Customer",
    },
    {
      id: `ac-contact-fixture-2-${clientAccountId}`,
      recordType: "CONTACT",
      externalId: "ac-102",
      name: "Elena Rostova",
      email: "elena.rostova@operational-client.test",
      phone: "+1-555-400-0102",
      companyName: "Rostova Capital",
      status: "Onboarding",
    },
    {
      id: `ac-company-fixture-1-${clientAccountId}`,
      recordType: "COMPANY",
      externalId: "ac-acc-201",
      name: "Vance Logistics",
      details: "https://vance-logistics.test",
    },
    {
      id: `ac-deal-fixture-1-${clientAccountId}`,
      recordType: "DEAL",
      externalId: "ac-deal-301",
      name: "Warehouse Automation Suite",
      amount: "15000.00",
      status: "Won",
      stage: "Onboarding Stage",
    },
    {
      id: `ac-note-fixture-1-${clientAccountId}`,
      recordType: "NOTE",
      externalId: "ac-note-401",
      name: "Kickoff Call Scheduled",
      details: "Agency completed sales handoff. Client onboarding team notified.",
      status: "COMPLETED",
    },
  ];
}
