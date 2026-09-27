import type { RequestContext } from "@/lib/models/canonical";
import { prisma } from "@/lib/db/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

export interface AuditEvent {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  requestId: string;
  source: "PLATFORM" | "HUBSPOT" | "MOCK" | "TWILIO" | "ACTIVECAMPAIGN" | "ZOHO";
  clientAccountId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Audit events are persisted with tenant and client-account scope. Metadata is
 * limited to operational values, never credentials or raw CRM payloads.
 */
export async function recordAuditEvent(context: RequestContext, event: AuditEvent) {
  const targetClientAccountId = event.clientAccountId ?? context.activeClientAccountId;
  await prisma.auditLog.create({
    data: {
      organizationId: context.user.organizationId,
      clientAccountId: targetClientAccountId,
      userId: context.user.id,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      source: event.source,
      requestId: event.requestId,
      metadata: event.metadata,
    },
  });

  console.info(
    JSON.stringify({
      event: "audit",
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      userId: context.user.id,
      ...event,
    }),
  );
}
