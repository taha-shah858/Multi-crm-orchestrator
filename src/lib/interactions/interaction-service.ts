import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";

const types = ["CALL", "SMS", "EMAIL", "NOTE", "CRM_ACTIVITY"] as const;
const directions = ["INBOUND", "OUTBOUND", "INTERNAL"] as const;

export async function listInteractions(context: RequestContext) {
  await prepareActiveClientSync(context);
  return prisma.interaction.findMany({
    where: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId },
    include: { contact: { select: { id: true, firstName: true, lastName: true, company: true, email: true } } },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });
}

export async function createManualInteraction(context: RequestContext, input: Record<string, unknown>, requestId: string) {
  await prepareActiveClientSync(context);
  const type = input.type;
  const direction = input.direction ?? "INTERNAL";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const subject = typeof input.subject === "string" ? input.subject.trim() || null : null;
  const contactId = typeof input.contactId === "string" && input.contactId ? input.contactId : null;
  if (!types.includes(type as typeof types[number]) || !directions.includes(direction as typeof directions[number]) || !body) {
    throw new AppError("INVALID_INTERACTION_INPUT", 422, "Invalid interaction input.", "Choose an interaction type and enter its details.");
  }
  if (contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true } });
    if (!contact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  }
  const interaction = await prisma.interaction.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId, userId: context.user.id, type: type as typeof types[number], direction: direction as typeof directions[number], source: "MANUAL", subject, body } });
  await recordAuditEvent(context, { action: "INTERACTION_CREATED", entityType: "INTERACTION", entityId: interaction.id, requestId, source: "PLATFORM", metadata: { type: interaction.type, direction: interaction.direction } });
  return interaction;
}
