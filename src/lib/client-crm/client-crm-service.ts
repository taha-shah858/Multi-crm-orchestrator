import "server-only";

import type { ClientRecordType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertClientAccess } from "@/lib/auth/auth-service";
import {
  fetchActiveCampaignRecords,
  createOrUpdateActiveCampaignRecord,
} from "@/lib/integrations/activecampaign/client";
import {
  fetchZohoRecords,
  createOrUpdateZohoRecord,
} from "@/lib/integrations/zoho/client";
import { isSyncableConnectionStatus } from "@/lib/integrations/connection-resolution";
import type { RequestContext, ClientCrmRecordSummary } from "@/lib/models/canonical";
import { doesContactMatchClient } from "./client-lead-matching";

/**
 * Synchronizes contacts from the Unified Lead Directory (Agency CRM / HubSpot)
 * into the Client CRM section when they match the active client account:
 * - Either explicitly linked by clientAccountId
 * - Or matching the client's company name or brand name via similarity strategy
 */
export async function syncUnifiedContactsToClientCrm(
  context: RequestContext,
): Promise<{ count: number }> {
  try {
    await assertClientAccess(context.user, context.activeClientAccountId);

    const clientAccount = await prisma.clientAccount.findFirst({
      where: {
        id: context.activeClientAccountId,
        organizationId: context.user.organizationId,
      },
    });

    if (!clientAccount) return { count: 0 };

    // Always delete any existing COMPANY records for this client account
    await prisma.clientCrmRecord.deleteMany({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
        recordType: "COMPANY",
      },
    });

    // Fetch all unified contacts in this organization
    const contacts = await prisma.contact.findMany({
      where: {
        organizationId: context.user.organizationId,
      },
      include: {
        crmCompany: true,
        deals: true,
        externalRecords: {
          include: { connection: { select: { provider: true } } },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Find any client-level integration connection
    const connection = await prisma.integrationConnection.findFirst({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
      },
    });

    let upsertedCount = 0;
    const validContactRecordIds: string[] = [];
    const validDealRecordIds: string[] = [];
    const matchedContactIds: string[] = [];

    for (const contact of contacts) {
      const match = doesContactMatchClient(contact, clientAccount);
      if (!match.matches) continue;
      matchedContactIds.push(contact.id);

      const fullName =
        [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() ||
        contact.email ||
        "Unified Lead";
      const companyName = contact.company || contact.crmCompany?.name || clientAccount.name;
      const primaryExt = contact.externalRecords?.[0];
      const contactExternalId = primaryExt?.externalId || `unified-${contact.id}`;
      const provider = primaryExt?.connection?.provider || connection?.provider || "ZOHO";

      // Look for existing ClientCrmRecord for this contact in the active client account
      const existing = await prisma.clientCrmRecord.findFirst({
        where: {
          organizationId: context.user.organizationId,
          clientAccountId: context.activeClientAccountId,
          recordType: "CONTACT",
          OR: [
            { externalId: contactExternalId },
            { externalId: `unified-${contact.id}` },
            { externalId: contact.id },
            ...(contact.email ? [{ email: contact.email }] : []),
          ],
        },
      });

      try {
        if (existing) {
          const updated = await prisma.clientCrmRecord.update({
            where: { id: existing.id },
            data: {
              name: fullName,
              provider: existing.provider || provider,
              email: contact.email ?? existing.email,
              phone: contact.phone ?? existing.phone,
              companyName: companyName ?? existing.companyName,
              lastSyncedAt: new Date(),
              customFields: {
                source: "UNIFIED_DIRECTORY",
                contactId: contact.id,
                matchedBy: match.reason,
                confidence: match.confidence,
                deals: (contact.deals || []).map((d) => ({
                  id: d.id,
                  title: d.title,
                  amount: (d.valueCents / 100).toFixed(2),
                  status: d.status,
                  stage: d.stageLabel,
                })),
              },
            },
          });
          validContactRecordIds.push(updated.id);
        } else {
          const created = await prisma.clientCrmRecord.create({
            data: {
              organizationId: context.user.organizationId,
              clientAccountId: context.activeClientAccountId,
              connectionId: connection?.id ?? null,
              provider,
              recordType: "CONTACT",
              externalId: contactExternalId,
              name: fullName,
              email: contact.email,
              phone: contact.phone,
              companyName,
              status: contact.deals?.some((d) => d.status === "CLOSED_WON") ? "Active Customer" : "Lead",
              stage: contact.deals?.[0]?.stageLabel || "Unified Lead",
              details: `Synced from Unified Lead Directory (${match.reason})`,
              customFields: {
                source: "UNIFIED_DIRECTORY",
                contactId: contact.id,
                matchedBy: match.reason,
                confidence: match.confidence,
                deals: (contact.deals || []).map((d) => ({
                  id: d.id,
                  title: d.title,
                  amount: (d.valueCents / 100).toFixed(2),
                  status: d.status,
                  stage: d.stageLabel,
                })),
              },
              lastSyncedAt: new Date(),
            },
          });
          validContactRecordIds.push(created.id);
          upsertedCount += 1;
        }
      } catch (contactErr) {
        console.warn("Contact sync item skipped due to conflict:", contactErr);
      }
    }

    // Ensure only deals belonging to the matched contacts of this client account exist in ClientCrmRecord
    const clientDeals =
      matchedContactIds.length > 0
        ? await prisma.deal.findMany({
            where: {
              organizationId: context.user.organizationId,
              contactId: { in: matchedContactIds },
            },
            include: {
              contact: true,
            },
            orderBy: { updatedAt: "desc" },
          })
        : [];

    for (const deal of clientDeals) {
      const dealExternalId = `deal-${deal.id}`;
      const existingDeal = await prisma.clientCrmRecord.findFirst({
        where: {
          organizationId: context.user.organizationId,
          clientAccountId: context.activeClientAccountId,
          recordType: "DEAL",
          OR: [{ externalId: dealExternalId }, { name: deal.title }],
        },
      });

      const contactName = deal.contact
        ? [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ").trim()
        : null;

      if (existingDeal) {
        const updated = await prisma.clientCrmRecord.update({
          where: { id: existingDeal.id },
          data: {
            name: deal.title,
            amount: (deal.valueCents / 100).toFixed(2),
            status: deal.status === "CLOSED_WON" ? "Won" : deal.status === "CLOSED_LOST" ? "Lost" : "Open",
            stage: deal.stageLabel || existingDeal.stage || "Pipeline",
            lastSyncedAt: new Date(),
            customFields: {
              ...(typeof existingDeal.customFields === "object" && existingDeal.customFields ? existingDeal.customFields : {}),
              source: "UNIFIED_DIRECTORY",
              dealId: deal.id,
              contactId: deal.contactId,
              contactName,
            },
          },
        });
        validDealRecordIds.push(updated.id);
      } else {
        try {
          const createdDeal = await prisma.clientCrmRecord.create({
            data: {
              organizationId: context.user.organizationId,
              clientAccountId: context.activeClientAccountId,
              connectionId: connection?.id ?? null,
              provider: connection?.provider || "ZOHO",
              recordType: "DEAL",
              externalId: dealExternalId,
              name: deal.title,
              amount: (deal.valueCents / 100).toFixed(2),
              status: deal.status === "CLOSED_WON" ? "Won" : deal.status === "CLOSED_LOST" ? "Lost" : "Open",
              stage: deal.stageLabel || "Pipeline",
              details: deal.notes || `Deal linked from Agency Unified Pipeline`,
              customFields: {
                source: "UNIFIED_DIRECTORY",
                dealId: deal.id,
                contactId: deal.contactId,
                contactName,
              },
              lastSyncedAt: new Date(),
            },
          });
          validDealRecordIds.push(createdDeal.id);
          upsertedCount += 1;
        } catch {
          // Ignore duplicate
        }
      }
    }

    // Purge any CONTACT records in ClientCrmRecord for this client account that are NOT in validContactRecordIds
    await prisma.clientCrmRecord.deleteMany({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
        recordType: "CONTACT",
        id: { notIn: validContactRecordIds },
      },
    });

    // Purge any DEAL records in ClientCrmRecord for this client account that do NOT belong to matched contacts' deals
    await prisma.clientCrmRecord.deleteMany({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
        recordType: "DEAL",
        id: { notIn: validDealRecordIds },
      },
    });

    // Purge obsolete mock fixture records
    await prisma.clientCrmRecord.deleteMany({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
        externalId: { in: ["ac-101", "ac-102", "ac-acc-201", "ac-deal-301", "ac-note-401"] },
      },
    });

    return { count: upsertedCount };
  } catch (err) {
    console.error("syncUnifiedContactsToClientCrm error:", err);
    return { count: 0 };
  }
}

export async function listClientCrmRecords(
  context: RequestContext,
  recordType?: ClientRecordType,
): Promise<ClientCrmRecordSummary[]> {
  await assertClientAccess(context.user, context.activeClientAccountId);

  // Sync matching contacts from the Unified Lead Directory into the active client account
  await syncUnifiedContactsToClientCrm(context);

  let records = await prisma.clientCrmRecord.findMany({
    where: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      ...(recordType ? { recordType } : {}),
    },
    orderBy: [{ recordType: "asc" }, { updatedAt: "desc" }],
  });

  // If no records exist yet for this client, populate from connected Client CRM
  if (records.length === 0) {
    await syncClientCrm(context);
    records = await prisma.clientCrmRecord.findMany({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
        ...(recordType ? { recordType } : {}),
      },
      orderBy: [{ recordType: "asc" }, { updatedAt: "desc" }],
    });
  }

  return records.map(formatClientCrmRecord);
}

export async function updateClientCrmRecord(
  context: RequestContext,
  recordId: string,
  input: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    companyName?: string | null;
    status?: string | null;
    stage?: string | null;
    amount?: string | null;
    details?: string | null;
  },
): Promise<{ record: ClientCrmRecordSummary; outboundStatus: string }> {
  await assertClientAccess(context.user, context.activeClientAccountId);

  const existing = await prisma.clientCrmRecord.findFirst({
    where: {
      id: recordId,
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
    },
    include: { connection: true },
  });

  if (!existing) {
    throw new AppError("RECORD_NOT_FOUND", 404, "Client CRM record was not found.", "Select a valid client CRM record.");
  }

  const updated = await prisma.clientCrmRecord.update({
    where: { id: existing.id },
    data: {
      name: input.name !== undefined ? input.name : existing.name,
      email: input.email !== undefined ? input.email : existing.email,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      companyName: input.companyName !== undefined ? input.companyName : existing.companyName,
      status: input.status !== undefined ? input.status : existing.status,
      stage: input.stage !== undefined ? input.stage : existing.stage,
      amount: input.amount !== undefined ? input.amount : existing.amount,
      details: input.details !== undefined ? input.details : existing.details,
    },
  });

  await recordAuditEvent(context, {
    action: "CLIENT_CRM_RECORD_UPDATED",
    entityType: "CLIENT_CRM_RECORD",
    entityId: updated.id,
    requestId: `crm-record-update-${updated.id}`,
    source: "PLATFORM",
    clientAccountId: context.activeClientAccountId,
    metadata: { recordType: updated.recordType, name: updated.name },
  });

  // 1. Sync edit back to Unified Lead Directory (prisma.contact) if linked
  if (updated.recordType === "CONTACT") {
    try {
      const customFields = existing.customFields as Record<string, unknown> | null;
      const contactId =
        typeof customFields?.contactId === "string"
          ? customFields.contactId
          : existing.externalId?.startsWith("unified-")
          ? existing.externalId.replace("unified-", "")
          : null;

      const contactWhere = contactId
        ? { id: contactId, organizationId: context.user.organizationId }
        : existing.email
        ? { email: existing.email, organizationId: context.user.organizationId }
        : null;

      if (contactWhere) {
        const contact = await prisma.contact.findFirst({ where: contactWhere });
        if (contact) {
          const parts = (updated.name || "").trim().split(/\s+/);
          const firstName = parts[0] || contact.firstName;
          const lastName = parts.slice(1).join(" ") || contact.lastName;

          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              ...(input.name !== undefined ? { firstName, lastName } : {}),
              ...(input.email !== undefined ? { email: input.email } : {}),
              ...(input.phone !== undefined ? { phone: input.phone } : {}),
              ...(input.companyName !== undefined ? { company: input.companyName } : {}),
            },
          });

          await recordAuditEvent(context, {
            action: "CONTACT_UPDATED",
            entityType: "CONTACT",
            entityId: contact.id,
            requestId: `crm-to-contact-${updated.id}`,
            source: "PLATFORM",
            clientAccountId: context.activeClientAccountId,
            metadata: { source: "CLIENT_CRM_SYNC", clientCrmRecordId: updated.id, name: updated.name },
          });
        }
      }
    } catch (contactErr) {
      console.error("Failed to sync client CRM update back to unified contact:", contactErr);
    }
  }

  // 2. Outbound write to Client's CRM provider (Zoho CRM / ActiveCampaign / Connected Provider)
  let outboundStatus = "LOCAL_ONLY";
  let targetConnection = existing.connection;

  if (!targetConnection) {
    targetConnection = await prisma.integrationConnection.findFirst({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
        provider: "ZOHO",
      },
    });

    if (!targetConnection) {
      targetConnection = await prisma.integrationConnection.findFirst({
        where: {
          organizationId: context.user.organizationId,
          clientAccountId: context.activeClientAccountId,
        },
      });
    }
  }

  if (targetConnection && isSyncableConnectionStatus(targetConnection.status)) {
    try {
      const parts = (updated.name || "").trim().split(/\s+/);
      const providerExternalId =
        existing.externalId &&
        !existing.externalId.startsWith("unified-") &&
        !existing.externalId.startsWith("comp-") &&
        !existing.externalId.startsWith("deal-") &&
        !existing.externalId.startsWith("zh-")
          ? existing.externalId
          : undefined;

      let outboundResultExternalId: string | undefined;

      if (targetConnection.provider === "ZOHO") {
        const zohoRecordType =
          existing.recordType === "DEAL"
            ? "DEAL"
            : existing.recordType === "NOTE"
            ? "NOTE"
            : "CONTACT";

        const zohoData: Record<string, unknown> =
          zohoRecordType === "CONTACT"
            ? {
                First_Name: parts[0] || "",
                Last_Name: parts.slice(1).join(" ") || "Contact",
                Email: updated.email,
                Phone: updated.phone,
              }
            : zohoRecordType === "DEAL"
            ? {
                Deal_Name: updated.name,
                Amount: updated.amount ? Number(updated.amount) : undefined,
                Stage: updated.stage || "Closed Won",
                Description: updated.details,
              }
            : {
                Note_Title: updated.name || "Note",
                Note_Content: updated.details || "",
              };

        const zohoResult = await createOrUpdateZohoRecord(
          targetConnection,
          zohoRecordType,
          zohoData,
          providerExternalId,
        );
        outboundResultExternalId = zohoResult.externalId;
      } else {
        const typeForProvider =
          existing.recordType === "CONTACT"
            ? "CONTACT"
            : existing.recordType === "COMPANY"
            ? "COMPANY"
            : existing.recordType === "DEAL"
            ? "DEAL"
            : "NOTE";

        const payloadData: Record<string, unknown> = {
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
          companyName: updated.companyName,
          title: updated.name,
          value: updated.amount,
        };

        const outboundResult = await createOrUpdateActiveCampaignRecord(
          targetConnection,
          typeForProvider,
          payloadData,
          providerExternalId,
        );
        outboundResultExternalId = outboundResult.externalId;
      }

      outboundStatus = "COMPLETED";
      await prisma.clientCrmRecord.update({
        where: { id: updated.id },
        data: {
          lastSyncedAt: new Date(),
          ...(outboundResultExternalId && outboundResultExternalId !== existing.externalId
            ? { externalId: outboundResultExternalId }
            : {}),
        },
      });
    } catch (outboundErr) {
      console.error("Outbound sync to client CRM failed:", outboundErr);
      outboundStatus = "FAILED";
    }
  }

  return { record: formatClientCrmRecord(updated), outboundStatus };
}

export async function syncClientCrm(
  context: RequestContext,
): Promise<{ count: number }> {
  await assertClientAccess(context.user, context.activeClientAccountId);

  // 1. Sync matching contacts from the Unified Lead Directory
  const unifiedResult = await syncUnifiedContactsToClientCrm(context);

  // 2. Look for client-owned Zoho (or ActiveCampaign / MOCK) connection
  let connection = await prisma.integrationConnection.findFirst({
    where: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      provider: "ZOHO",
    },
  });

  if (!connection) {
    connection = await prisma.integrationConnection.findFirst({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
        provider: "ACTIVECAMPAIGN",
      },
    });
  }

  if (!connection) {
    connection = await prisma.integrationConnection.findFirst({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
      },
    });
  }

  if (!connection || !isSyncableConnectionStatus(connection.status)) {
    return { count: unifiedResult.count };
  }

  let upserted = unifiedResult.count;

  // 3. Sync live records from provider if available
  try {
    const rawRecords =
      connection.provider === "ZOHO"
        ? await fetchZohoRecords(connection)
        : await fetchActiveCampaignRecords(connection);

    for (const r of rawRecords) {
      if (r.recordType === "COMPANY") continue;

      await prisma.clientCrmRecord.upsert({
        where: {
          connectionId_recordType_externalId: {
            connectionId: connection.id,
            recordType: r.recordType,
            externalId: r.externalId,
          },
        },
        update: {
          name: r.name,
          email: r.email,
          phone: r.phone,
          companyName: r.companyName,
          status: r.status,
          stage: r.stage,
          amount: r.amount,
          details: r.details,
          lastSyncedAt: new Date(),
        },
        create: {
          organizationId: context.user.organizationId,
          clientAccountId: context.activeClientAccountId,
          connectionId: connection.id,
          provider: connection.provider,
          recordType: r.recordType,
          externalId: r.externalId,
          name: r.name,
          email: r.email,
          phone: r.phone,
          companyName: r.companyName,
          status: r.status,
          stage: r.stage,
          amount: r.amount,
          details: r.details,
          lastSyncedAt: new Date(),
        },
      });
      upserted += 1;
    }

    // Purge mock fixtures if real records were synced
    if (upserted > 0) {
      await prisma.clientCrmRecord.deleteMany({
        where: {
          clientAccountId: context.activeClientAccountId,
          externalId: { in: ["ac-101", "ac-102", "ac-acc-201", "ac-deal-301", "ac-note-401"] },
        },
      });
    }

    const auditSource = connection.provider === "ZOHO" ? "ZOHO" : "ACTIVECAMPAIGN";
    await recordAuditEvent(context, {
      action: "CLIENT_CRM_SYNC_COMPLETED",
      entityType: "CLIENT_CRM",
      requestId: `crm-sync-${connection.id}`,
      source: auditSource,
      clientAccountId: context.activeClientAccountId,
      metadata: { count: upserted, provider: connection.provider },
    });
  } catch (err) {
    console.error("Client CRM external sync error:", err);
  }

  return { count: upserted };
}

function formatClientCrmRecord(record: any): ClientCrmRecordSummary {
  return {
    id: record.id,
    organizationId: record.organizationId,
    clientAccountId: record.clientAccountId,
    connectionId: record.connectionId,
    provider: record.provider,
    recordType: record.recordType,
    externalId: record.externalId,
    name: record.name,
    email: record.email,
    phone: record.phone,
    companyName: record.companyName,
    status: record.status,
    stage: record.stage,
    amount: record.amount,
    details: record.details,
    customFields: record.customFields as Record<string, unknown> | null,
    lastSyncedAt: record.lastSyncedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
