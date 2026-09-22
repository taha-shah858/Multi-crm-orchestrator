import "server-only";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { getIntegrationAdapter } from "@/lib/integrations/registry";
import { activeClientIntegrationWhere } from "@/lib/integrations/connection-resolution";
import type { CompanyWriteInput, DealWriteInput } from "@/lib/integrations/types";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";

type Input = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const nullableText = (value: unknown) => value === null ? null : typeof value === "string" ? value.trim() || null : undefined;

function dateValue(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw new AppError("INVALID_DEAL_INPUT", 422, "Expected close date is invalid.", "Enter a valid expected close date.");
  return result;
}

export async function updateActiveClientCompany(context: RequestContext, companyId: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  const company = await prisma.crmCompany.findFirst({ where: { id: companyId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } });
  if (!company) throw new AppError("COMPANY_NOT_FOUND", 404, "CRM company is outside the active client.", "Choose a company from the active client account.");
  const values = {
    name: input.name === undefined ? company.name : text(input.name),
    domain: input.domain === undefined ? company.domain : nullableText(input.domain),
    website: input.website === undefined ? company.website : nullableText(input.website),
    phone: input.phone === undefined ? company.phone : nullableText(input.phone),
    industry: input.industry === undefined ? company.industry : nullableText(input.industry),
    city: input.city === undefined ? company.city : nullableText(input.city),
    state: input.state === undefined ? company.state : nullableText(input.state),
    country: input.country === undefined ? company.country : nullableText(input.country),
    address: input.address === undefined ? company.address : nullableText(input.address),
  };
  if (!values.name || Object.values(values).some((value) => value === undefined)) throw new AppError("INVALID_COMPANY_INPUT", 422, "Company fields are invalid.", "Enter a company name and valid text values.");
  const persisted = await prisma.crmCompany.update({ where: { id: company.id }, data: values });
  await recordAuditEvent(context, { action: "COMPANY_UPDATED", entityType: "CRM_COMPANY", entityId: company.id, requestId, source: "PLATFORM", metadata: { localFirst: true } });

  const mapping = await prisma.externalRecord.findFirst({ where: { crmCompanyId: company.id, objectType: "COMPANY", clientAccountId: context.activeClientAccountId, connection: activeClientIntegrationWhere(context, "HUBSPOT") }, include: { connection: true } });
  if (!mapping) return { company: persisted, outboundSync: { status: "NOT_MAPPED" as const, retryable: false } };
  try {
    const adapter = getIntegrationAdapter("HUBSPOT");
    if (!adapter.updateCompany) throw new Error("HubSpot company writes are unavailable.");
    await adapter.updateCompany(mapping.connection, mapping.externalId, values as CompanyWriteInput);
    await prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
    await recordAuditEvent(context, { action: "COMPANY_OUTBOUND_SYNC_COMPLETED", entityType: "CRM_COMPANY", entityId: company.id, requestId, source: "HUBSPOT", metadata: { externalId: mapping.externalId } });
    return { company: persisted, outboundSync: { status: "COMPLETED" as const, retryable: false } };
  } catch (error) {
    const safeMessage = error instanceof AppError ? error.safeMessage : "HubSpot could not update this company. Your local edit is saved; retry later.";
    await recordAuditEvent(context, { action: "COMPANY_OUTBOUND_SYNC_FAILED", entityType: "CRM_COMPANY", entityId: company.id, requestId, source: "HUBSPOT", metadata: { externalId: mapping.externalId } });
    return { company: persisted, outboundSync: { status: "FAILED" as const, retryable: true, error: safeMessage } };
  }
}

export async function updateActiveClientDeal(context: RequestContext, dealId: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } });
  if (!deal) throw new AppError("DEAL_NOT_FOUND", 404, "Deal is outside the active client.", "Choose a deal from the active client account.");
  const amount = input.amount === undefined ? deal.valueCents / 100 : Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) throw new AppError("INVALID_DEAL_INPUT", 422, "Deal amount is invalid.", "Enter a valid non-negative deal amount.");
  const crmOwnerId = input.crmOwnerId === undefined ? deal.crmOwnerId : nullableText(input.crmOwnerId);
  if (crmOwnerId === undefined) throw new AppError("INVALID_DEAL_INPUT", 422, "Deal owner is invalid.", "Choose a valid CRM owner.");
  const title = input.title === undefined ? deal.title : text(input.title);
  if (!title) throw new AppError("INVALID_DEAL_INPUT", 422, "Deal title is required.", "Enter a deal title.");
  const persisted = await prisma.deal.update({ where: { id: deal.id }, data: {
    title,
    valueCents: Math.round(amount * 100),
    pipelineId: input.pipelineId === undefined ? deal.pipelineId : nullableText(input.pipelineId),
    stageId: input.stageId === undefined ? deal.stageId : nullableText(input.stageId),
    expectedCloseAt: input.expectedCloseAt === undefined ? deal.expectedCloseAt : dateValue(input.expectedCloseAt),
    crmOwnerId,
  } });
  await recordAuditEvent(context, { action: "DEAL_UPDATED", entityType: "DEAL", entityId: deal.id, requestId, source: "PLATFORM", metadata: { localFirst: true } });

  const mapping = await prisma.externalRecord.findFirst({ where: { dealId: deal.id, objectType: "DEAL", clientAccountId: context.activeClientAccountId, connection: activeClientIntegrationWhere(context, "HUBSPOT") }, include: { connection: true } });
  if (!mapping) return { deal: persisted, outboundSync: { status: "NOT_MAPPED" as const, retryable: false } };
  try {
    let ownerExternalId: string | null = null;
    if (persisted.crmOwnerId) {
      const ownerMapping = await prisma.externalRecord.findFirst({ where: { connectionId: mapping.connectionId, objectType: "OWNER", crmOwnerId: persisted.crmOwnerId }, select: { externalId: true } });
      if (!ownerMapping) throw new AppError("INVALID_DEAL_OWNER", 422, "Deal owner has no mapping for this HubSpot account.", "Choose an owner synchronized from the connected HubSpot account.");
      ownerExternalId = ownerMapping.externalId;
    }
    const outbound: DealWriteInput = { name: persisted.title, amount: (persisted.valueCents / 100).toFixed(2), pipelineId: persisted.pipelineId, stageId: persisted.stageId, expectedCloseAt: persisted.expectedCloseAt, ownerExternalId };
    const adapter = getIntegrationAdapter("HUBSPOT");
    if (!adapter.updateDeal) throw new Error("HubSpot deal writes are unavailable.");
    await adapter.updateDeal(mapping.connection, mapping.externalId, outbound);
    await prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
    await recordAuditEvent(context, { action: "DEAL_OUTBOUND_SYNC_COMPLETED", entityType: "DEAL", entityId: deal.id, requestId, source: "HUBSPOT", metadata: { externalId: mapping.externalId } });
    return { deal: persisted, outboundSync: { status: "COMPLETED" as const, retryable: false } };
  } catch (error) {
    const safeMessage = error instanceof AppError ? error.safeMessage : "HubSpot could not update this deal. Your local edit is saved; retry later.";
    await recordAuditEvent(context, { action: "DEAL_OUTBOUND_SYNC_FAILED", entityType: "DEAL", entityId: deal.id, requestId, source: "HUBSPOT", metadata: { externalId: mapping.externalId } });
    return { deal: persisted, outboundSync: { status: "FAILED" as const, retryable: true, error: safeMessage } };
  }
}

export function retryActiveClientCompanySync(context: RequestContext, companyId: string, requestId: string) {
  return updateActiveClientCompany(context, companyId, {}, requestId);
}

export function retryActiveClientDealSync(context: RequestContext, dealId: string, requestId: string) {
  return updateActiveClientDeal(context, dealId, {}, requestId);
}
