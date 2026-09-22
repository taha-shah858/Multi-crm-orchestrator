import "server-only";

import type { ExternalObjectType, IntegrationConnection, Prisma } from "@prisma/client";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertClientAccess } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { getIntegrationAdapter } from "@/lib/integrations/registry";
import type { ProviderSalesRecord, SalesCrmSnapshot } from "@/lib/integrations/types";
import type { RequestContext } from "@/lib/models/canonical";
import type { ContactSyncSummary } from "@/lib/sync/contact-sync-service";
import { persistContacts } from "@/lib/sync/contact-sync-service";
import { normalizeRichTextToPlainText } from "@/lib/text/plain-text";

type Counts = { read: number; created: number; updated: number; failed: number };
type CategoryCounts = Record<string, Counts>;

const emptyCounts = (): Counts => ({ read: 0, created: 0, updated: 0, failed: 0 });
const clean = (value: string | null | undefined) => value?.trim() || null;
const activityPlainText = (value: string | null | undefined) => normalizeRichTextToPlainText(value);
const validDate = (value: string | null | undefined) => {
  if (!value) return null;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
};
const jsonProperties = (properties: ProviderSalesRecord["properties"]): Prisma.InputJsonObject => Object.fromEntries(
  Object.entries(properties).filter((entry): entry is [string, string | null] => entry[1] !== undefined),
);

function valueCents(value: string | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount * 100));
}

function activityText(record: ProviderSalesRecord, objectType: ExternalObjectType) {
  const props = record.properties;
  if (objectType === "CALL") return { subject: activityPlainText(props.hs_call_title) ?? "HubSpot call", body: activityPlainText(props.hs_call_body) ?? activityPlainText(props.hs_call_status) ?? "Call logged in HubSpot" };
  if (objectType === "MEETING") return { subject: activityPlainText(props.hs_meeting_title) ?? "HubSpot meeting", body: activityPlainText(props.hs_meeting_body) ?? "Meeting logged in HubSpot" };
  if (objectType === "NOTE") return { subject: "HubSpot note", body: activityPlainText(props.hs_note_body) ?? "Note logged in HubSpot" };
  if (objectType === "TASK") return { subject: activityPlainText(props.hs_task_subject) ?? "HubSpot task", body: activityPlainText(props.hs_task_body) ?? activityPlainText(props.hs_task_status) ?? "Task logged in HubSpot" };
  return { subject: activityPlainText(props.hs_email_subject) ?? "HubSpot email", body: activityPlainText(props.hs_email_text) ?? activityPlainText(props.hs_email_status) ?? "Email logged in HubSpot" };
}

function activityDirection(record: ProviderSalesRecord) {
  const raw = `${record.properties.hs_call_direction ?? record.properties.hs_email_direction ?? ""}`.toUpperCase();
  if (raw.includes("INBOUND") || raw.includes("INCOMING")) return "INBOUND" as const;
  if (raw.includes("OUTBOUND") || raw.includes("OUTGOING")) return "OUTBOUND" as const;
  return "INTERNAL" as const;
}

async function mappedIds(connectionId: string) {
  const mappings = await prisma.externalRecord.findMany({ where: { connectionId } });
  return {
    contacts: new Map(mappings.filter((item) => item.objectType === "CONTACT" && item.contactId).map((item) => [item.externalId, item.contactId!])),
    companies: new Map(mappings.filter((item) => item.objectType === "COMPANY" && item.crmCompanyId).map((item) => [item.externalId, item.crmCompanyId!])),
    deals: new Map(mappings.filter((item) => item.objectType === "DEAL" && item.dealId).map((item) => [item.externalId, item.dealId!])),
    owners: new Map(mappings.filter((item) => item.objectType === "OWNER" && item.crmOwnerId).map((item) => [item.externalId, item.crmOwnerId!])),
  };
}

async function persistOwners(context: RequestContext, connection: IntegrationConnection, snapshot: SalesCrmSnapshot, counts: CategoryCounts) {
  counts.owners.read = snapshot.owners.length;
  for (const owner of snapshot.owners) {
    const mapping = await prisma.externalRecord.findUnique({ where: { connectionId_objectType_externalId: { connectionId: connection.id, objectType: "OWNER", externalId: owner.id } } });
    const firstName = clean(owner.firstName);
    const lastName = clean(owner.lastName);
    const data = {
      firstName,
      lastName,
      displayName: [firstName, lastName].filter(Boolean).join(" ") || clean(owner.email) || `HubSpot owner ${owner.id}`,
      email: clean(owner.email),
      providerUserId: owner.userId ? String(owner.userId) : null,
      teamId: owner.teams?.[0]?.id ?? null,
      archived: Boolean(owner.archived),
      sourceMetadata: { teamIds: owner.teams?.map((team) => team.id) ?? [] },
    } satisfies Prisma.CrmOwnerUncheckedUpdateInput;
    if (mapping?.crmOwnerId) {
      await prisma.crmOwner.update({ where: { id: mapping.crmOwnerId }, data });
      await prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
      counts.owners.updated += 1;
    } else {
      const created = await prisma.crmOwner.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, ...data } });
      await prisma.externalRecord.upsert({
        where: { connectionId_objectType_externalId: { connectionId: connection.id, objectType: "OWNER", externalId: owner.id } },
        create: { clientAccountId: context.activeClientAccountId, connectionId: connection.id, objectType: "OWNER", externalId: owner.id, crmOwnerId: created.id, lastSyncedAt: new Date() },
        update: { crmOwnerId: created.id, lastSyncedAt: new Date() },
      });
      counts.owners.created += 1;
    }
  }
}

async function persistPipelines(context: RequestContext, connection: IntegrationConnection, snapshot: SalesCrmSnapshot, counts: CategoryCounts) {
  counts.pipelines.read = snapshot.pipelines.length;
  for (const providerPipeline of snapshot.pipelines) {
    const pipeline = await prisma.crmPipeline.upsert({
      where: { connectionId_providerPipelineId: { connectionId: connection.id, providerPipelineId: providerPipeline.id } },
      create: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, connectionId: connection.id, providerPipelineId: providerPipeline.id, label: providerPipeline.label, displayOrder: providerPipeline.displayOrder, archived: Boolean(providerPipeline.archived) },
      update: { label: providerPipeline.label, displayOrder: providerPipeline.displayOrder, archived: Boolean(providerPipeline.archived) },
    });
    for (const stage of providerPipeline.stages) {
      const probability = Number(stage.metadata?.probability);
      await prisma.crmPipelineStage.upsert({
        where: { pipelineId_providerStageId: { pipelineId: pipeline.id, providerStageId: stage.id } },
        create: { pipelineId: pipeline.id, providerStageId: stage.id, label: stage.label, displayOrder: stage.displayOrder, probability: Number.isFinite(probability) ? probability : null, isClosed: stage.metadata?.isClosed === "true" },
        update: { label: stage.label, displayOrder: stage.displayOrder, probability: Number.isFinite(probability) ? probability : null, isClosed: stage.metadata?.isClosed === "true" },
      });
    }
    counts.pipelines.updated += 1;
  }
}

async function persistCompanies(context: RequestContext, connection: IntegrationConnection, snapshot: SalesCrmSnapshot, counts: CategoryCounts) {
  counts.companies.read = snapshot.companies.length;
  const ids = await mappedIds(connection.id);
  for (const company of snapshot.companies) {
    const mapping = await prisma.externalRecord.findUnique({ where: { connectionId_objectType_externalId: { connectionId: connection.id, objectType: "COMPANY", externalId: company.id } } });
    const ownerId = clean(company.properties.hubspot_owner_id);
    const data = {
      name: clean(company.properties.name) ?? `HubSpot company ${company.id}`,
      domain: clean(company.properties.domain),
      website: clean(company.properties.website),
      phone: clean(company.properties.phone),
      industry: clean(company.properties.industry),
      city: clean(company.properties.city),
      state: clean(company.properties.state),
      country: clean(company.properties.country),
      address: clean(company.properties.address),
      crmOwnerId: ownerId ? ids.owners.get(ownerId) ?? null : null,
      sourceMetadata: jsonProperties(company.properties),
    } satisfies Prisma.CrmCompanyUncheckedUpdateInput;
    if (mapping?.crmCompanyId) {
      await prisma.crmCompany.update({ where: { id: mapping.crmCompanyId }, data });
      await prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
      counts.companies.updated += 1;
    } else {
      const created = await prisma.crmCompany.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, ...data } });
      await prisma.externalRecord.upsert({ where: { connectionId_objectType_externalId: { connectionId: connection.id, objectType: "COMPANY", externalId: company.id } }, create: { clientAccountId: context.activeClientAccountId, connectionId: connection.id, objectType: "COMPANY", externalId: company.id, crmCompanyId: created.id, lastSyncedAt: new Date() }, update: { crmCompanyId: created.id, lastSyncedAt: new Date() } });
      counts.companies.created += 1;
    }
  }
}

function dealStatus(record: ProviderSalesRecord, stage: { isClosed: boolean; probability: number | null } | undefined) {
  const won = record.properties.hs_is_closed_won === "true" || (stage?.isClosed && stage.probability === 1);
  const closed = record.properties.hs_is_closed === "true" || stage?.isClosed;
  if (won) return "CLOSED_WON" as const;
  if (closed) return "CLOSED_LOST" as const;
  return "OPEN" as const;
}

async function persistDeals(context: RequestContext, connection: IntegrationConnection, snapshot: SalesCrmSnapshot, counts: CategoryCounts) {
  counts.deals.read = snapshot.deals.length;
  const ids = await mappedIds(connection.id);
  const pipelines = await prisma.crmPipeline.findMany({ where: { connectionId: connection.id }, include: { stages: true } });
  for (const deal of snapshot.deals) {
    const mapping = await prisma.externalRecord.findUnique({ where: { connectionId_objectType_externalId: { connectionId: connection.id, objectType: "DEAL", externalId: deal.id } } });
    const pipeline = pipelines.find((item) => item.providerPipelineId === deal.properties.pipeline);
    const stage = pipeline?.stages.find((item) => item.providerStageId === deal.properties.dealstage);
    const contactIds = deal.associations.contacts.map((id) => ids.contacts.get(id)).filter((id): id is string => Boolean(id));
    const companyId = deal.associations.companies.map((id) => ids.companies.get(id)).find(Boolean) ?? null;
    const ownerExternalId = clean(deal.properties.hubspot_owner_id);
    const status = dealStatus(deal, stage);
    const data = {
      contactId: contactIds[0] ?? null,
      companyId,
      crmOwnerId: ownerExternalId ? ids.owners.get(ownerExternalId) ?? null : null,
      title: clean(deal.properties.dealname) ?? `HubSpot deal ${deal.id}`,
      valueCents: valueCents(deal.properties.amount),
      currency: clean(deal.properties.hs_currency_code)?.toUpperCase() ?? "USD",
      status,
      pipelineId: clean(deal.properties.pipeline),
      pipelineLabel: pipeline?.label ?? clean(deal.properties.pipeline),
      stageId: clean(deal.properties.dealstage),
      stageLabel: stage?.label ?? clean(deal.properties.dealstage),
      expectedCloseAt: validDate(deal.properties.closedate),
      closedAt: status === "CLOSED_WON" ? validDate(deal.properties.hs_closed_won_date) ?? validDate(deal.properties.closedate) : status === "CLOSED_LOST" ? validDate(deal.properties.hs_closed_lost_date) ?? validDate(deal.properties.closedate) : null,
      isManual: false,
      sourceMetadata: jsonProperties(deal.properties),
    } satisfies Prisma.DealUncheckedUpdateInput;
    let dealId: string;
    if (mapping?.dealId) {
      await prisma.deal.update({ where: { id: mapping.dealId }, data });
      await prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
      dealId = mapping.dealId;
      counts.deals.updated += 1;
    } else {
      const created = await prisma.deal.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, ...data } });
      dealId = created.id;
      await prisma.externalRecord.upsert({ where: { connectionId_objectType_externalId: { connectionId: connection.id, objectType: "DEAL", externalId: deal.id } }, create: { clientAccountId: context.activeClientAccountId, connectionId: connection.id, objectType: "DEAL", externalId: deal.id, dealId, lastSyncedAt: new Date() }, update: { dealId, lastSyncedAt: new Date() } });
      counts.deals.created += 1;
    }
    await prisma.dealContact.deleteMany({ where: { dealId } });
    if (contactIds.length) await prisma.dealContact.createMany({ data: [...new Set(contactIds)].map((contactId, index) => ({ dealId, contactId, isPrimary: index === 0 })), skipDuplicates: true });
  }
}

async function applyContactAssociations(connection: IntegrationConnection, snapshot: SalesCrmSnapshot) {
  const ids = await mappedIds(connection.id);
  for (const record of snapshot.contactRecords) {
    const contactId = ids.contacts.get(record.id);
    if (!contactId) continue;
    const companyId = record.associations.companies.map((id) => ids.companies.get(id)).find(Boolean) ?? null;
    const ownerExternalId = clean(record.properties.hubspot_owner_id);
    const company = companyId ? await prisma.crmCompany.findUnique({ where: { id: companyId }, select: { name: true } }) : null;
    await prisma.contact.update({ where: { id: contactId }, data: { crmCompanyId: companyId, crmOwnerId: ownerExternalId ? ids.owners.get(ownerExternalId) ?? null : null, ...(company ? { company: company.name } : {}) } });
  }
}

async function persistActivities(context: RequestContext, connection: IntegrationConnection, snapshot: SalesCrmSnapshot, counts: CategoryCounts) {
  counts.activities.read = snapshot.activities.length;
  const ids = await mappedIds(connection.id);
  for (const activity of snapshot.activities) {
    const mapping = await prisma.externalRecord.findUnique({ where: { connectionId_objectType_externalId: { connectionId: connection.id, objectType: activity.objectType, externalId: activity.id } } });
    const contacts = activity.associations.contacts.map((id) => ids.contacts.get(id)).filter((id): id is string => Boolean(id));
    const companies = activity.associations.companies.map((id) => ids.companies.get(id)).filter((id): id is string => Boolean(id));
    const deals = activity.associations.deals.map((id) => ids.deals.get(id)).filter((id): id is string => Boolean(id));
    const text = activityText(activity, activity.objectType);
    const occurredAt = validDate(activity.properties.hs_timestamp) ?? validDate(activity.createdAt) ?? new Date();
    const data = { contactId: contacts[0] ?? null, type: activity.objectType, direction: activityDirection(activity), source: "HUBSPOT" as const, subject: text.subject, body: text.body, occurredAt, metadata: { provider: "HUBSPOT", objectType: activity.objectType, properties: jsonProperties(activity.properties) } } satisfies Prisma.InteractionUncheckedUpdateInput;
    let interactionId: string;
    if (mapping?.interactionId) {
      await prisma.interaction.update({ where: { id: mapping.interactionId }, data });
      await prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
      interactionId = mapping.interactionId;
      counts.activities.updated += 1;
    } else {
      const created = await prisma.interaction.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, ...data } });
      interactionId = created.id;
      await prisma.externalRecord.upsert({ where: { connectionId_objectType_externalId: { connectionId: connection.id, objectType: activity.objectType, externalId: activity.id } }, create: { clientAccountId: context.activeClientAccountId, connectionId: connection.id, objectType: activity.objectType, externalId: activity.id, interactionId, lastSyncedAt: new Date() }, update: { interactionId, lastSyncedAt: new Date() } });
      counts.activities.created += 1;
    }
    await prisma.$transaction([
      prisma.interactionContact.deleteMany({ where: { interactionId } }),
      prisma.interactionCompany.deleteMany({ where: { interactionId } }),
      prisma.interactionDeal.deleteMany({ where: { interactionId } }),
    ]);
    if (contacts.length) await prisma.interactionContact.createMany({ data: [...new Set(contacts)].map((contactId) => ({ interactionId, contactId })), skipDuplicates: true });
    if (companies.length) await prisma.interactionCompany.createMany({ data: [...new Set(companies)].map((companyId) => ({ interactionId, companyId })), skipDuplicates: true });
    if (deals.length) await prisma.interactionDeal.createMany({ data: [...new Set(deals)].map((dealId) => ({ interactionId, dealId })), skipDuplicates: true });
  }
}

export async function syncHubSpotSalesCrm(context: RequestContext, connection: IntegrationConnection, requestId: string): Promise<ContactSyncSummary> {
  await assertClientAccess(context.user, context.activeClientAccountId);
  if (connection.provider !== "HUBSPOT" || connection.organizationId !== context.user.organizationId || connection.clientAccountId !== context.activeClientAccountId || connection.ownershipType !== "CLIENT_ACCOUNT") {
    throw new AppError("CLIENT_ACCESS_DENIED", 403, "HubSpot connection is outside the active client account.", "Choose the HubSpot integration for the active client account.");
  }
  const adapter = getIntegrationAdapter("HUBSPOT");
  if (!adapter.fetchSalesCrm) throw new AppError("CRM_PROVIDER_UNAVAILABLE", 422, "HubSpot sales CRM capability is unavailable.", "HubSpot sales CRM synchronization is unavailable.");
  const syncRun = await prisma.syncRun.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, connectionId: connection.id, userId: context.user.id, provider: "HUBSPOT", status: "RUNNING" } });
  await recordAuditEvent(context, { action: "SALES_CRM_SYNC_STARTED", entityType: "SYNC_RUN", entityId: syncRun.id, requestId, source: "HUBSPOT" });

  const counts: CategoryCounts = { contacts: emptyCounts(), companies: emptyCounts(), deals: emptyCounts(), owners: emptyCounts(), pipelines: emptyCounts(), activities: emptyCounts() };
  try {
    const snapshot = await adapter.fetchSalesCrm(connection);
    await persistOwners(context, connection, snapshot, counts);
    await persistPipelines(context, connection, snapshot, counts);
    await persistCompanies(context, connection, snapshot, counts);
    counts.contacts.read = snapshot.contacts.length;
    const contactCounts = await persistContacts(context, connection.id, snapshot.contacts);
    counts.contacts.created = contactCounts.recordsCreated;
    counts.contacts.updated = contactCounts.recordsUpdated;
    await applyContactAssociations(connection, snapshot);
    await persistDeals(context, connection, snapshot, counts);
    await persistActivities(context, connection, snapshot, counts);

    for (const failure of snapshot.failures) {
      const category = counts[failure.category] ?? counts.activities;
      category.failed += 1;
    }
    const totals = Object.values(counts).reduce((sum, category) => ({ read: sum.read + category.read, created: sum.created + category.created, updated: sum.updated + category.updated, failed: sum.failed + category.failed }), emptyCounts());
    const allFailed = snapshot.failures.length === 10;
    const status = allFailed ? "FAILED" : "COMPLETED";
    const lastError = snapshot.failures.length ? snapshot.failures.map((failure) => `${failure.category}: ${failure.message}`).join(" ") : null;
    await prisma.$transaction([
      prisma.syncRun.update({ where: { id: syncRun.id }, data: { status, recordsRead: totals.read, recordsCreated: totals.created, recordsUpdated: totals.updated, recordsFailed: totals.failed, categoryCounts: counts, errorMessage: lastError, completedAt: new Date() } }),
      prisma.integrationConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date(), status: snapshot.failures.length ? "DEGRADED" : "CONNECTED", lastError } }),
    ]);
    await recordAuditEvent(context, { action: allFailed ? "SALES_CRM_SYNC_FAILED" : "SALES_CRM_SYNC_COMPLETED", entityType: "SYNC_RUN", entityId: syncRun.id, requestId, source: "HUBSPOT", metadata: { counts, partialFailures: snapshot.failures.map((failure) => failure.category) } });
    return { contacts: snapshot.contacts, recordsRead: totals.read, recordsCreated: totals.created, recordsUpdated: totals.updated, recordsFailed: totals.failed, runs: [{ id: syncRun.id, provider: "HUBSPOT", status, ...(lastError ? { error: lastError } : {}) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "HubSpot sales CRM synchronization failed.";
    const safeMessage = error instanceof AppError ? error.safeMessage : "HubSpot sales CRM synchronization failed. Retry when the provider is available.";
    await prisma.$transaction([
      prisma.syncRun.update({ where: { id: syncRun.id }, data: { status: "FAILED", recordsFailed: 1, categoryCounts: counts, errorMessage: message, completedAt: new Date() } }),
      prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: "DEGRADED", lastError: safeMessage } }),
    ]);
    await recordAuditEvent(context, { action: "SALES_CRM_SYNC_FAILED", entityType: "SYNC_RUN", entityId: syncRun.id, requestId, source: "HUBSPOT", metadata: { counts } });
    return { contacts: [], recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 1, runs: [{ id: syncRun.id, provider: "HUBSPOT", status: "FAILED", error: safeMessage }] };
  }
}
