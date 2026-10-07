import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertClientAccess } from "@/lib/auth/auth-service";
import { AppError } from "@/lib/errors/app-error";
import { getUnifiedLeads } from "@/lib/sync/contact-sync-service";
import type { RequestContext, ClientCrmRecordSummary } from "@/lib/models/canonical";
import { doesContactMatchClient } from "./client-lead-matching";

/** Read-only projection: never copies agency contacts into client/Zoho records. */
export async function listClientDirectoryContacts(context: RequestContext): Promise<ClientCrmRecordSummary[]> {
  await assertClientAccess(context.user, context.activeClientAccountId);
  const client = await prisma.clientAccount.findFirst({
    where: { id: context.activeClientAccountId, organizationId: context.user.organizationId },
    select: { id: true, name: true, brandName: true },
  });
  if (!client) throw new AppError("CLIENT_ACCESS_DENIED", 403, "Client not found.", "Select an assigned client account.");
  const contacts = (await getUnifiedLeads(context)).filter(contact => doesContactMatchClient({
    clientAccountId: "", company: contact.company, crmCompany: contact.companyDetails,
  }, client).matches);
  const deals = contacts.length ? await prisma.deal.findMany({
    where: { organizationId: context.user.organizationId, clientAccountId: client.id, contactId: { in: contacts.map(contact => contact.id) } },
    select: { id: true, contactId: true, title: true, valueCents: true, currency: true, status: true, stageLabel: true },
  }) : [];
  return contacts.map(contact => ({
    id: contact.id, organizationId: context.user.organizationId, clientAccountId: client.id,
    connectionId: null, provider: "HUBSPOT", recordType: "CONTACT", externalId: contact.externalId,
    name: `${contact.firstName} ${contact.lastName}`.trim(), email: contact.email, phone: contact.phone,
    companyName: contact.company || contact.companyDetails?.name || null,
    status: null, stage: null, amount: null, details: null, lastSyncedAt: null,
    createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString(),
    customFields: { source: "UNIFIED_DIRECTORY", contactId: contact.id, matchedBy: "Company / brand name", deals: deals.filter(deal => deal.contactId === contact.id).map(deal => ({
      id: deal.id, title: deal.title, amount: (deal.valueCents / 100).toFixed(2), currency: deal.currency, status: deal.status, stage: deal.stageLabel,
    })) },
  }));
}
