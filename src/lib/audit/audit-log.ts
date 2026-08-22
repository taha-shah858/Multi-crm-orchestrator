import type { RequestContext } from "@/lib/models/canonical";
import { prisma } from "@/lib/db/prisma";

export interface AuditEvent {
  action:
    | "CONTACT_IMPORT_REQUESTED"
    | "CONTACT_IMPORT_COMPLETED"
    | "CONTACT_SYNC_STARTED"
    | "CONTACT_SYNC_COMPLETED"
    | "CONTACT_SYNC_FAILED"
    | "INTERACTION_CREATED"
    | "COMMUNICATION_DISPATCHED"
    | "COMMUNICATION_MANUALLY_LOGGED"
    | "LEAD_ANALYSIS_CREATED"
    | "LEAD_ANALYSIS_UPDATED"
    | "SCRIPT_CREATED"
    | "SCRIPT_UPDATED"
    | "APPOINTMENT_CREATED"
    | "APPOINTMENT_UPDATED"
    | "APPOINTMENT_CANCELLED";
  entityType: "CONTACT" | "SYNC_RUN" | "INTERACTION" | "COMMUNICATION_IDENTITY" | "LEAD_ANALYSIS" | "SALES_SCRIPT" | "APPOINTMENT";
  entityId?: string;
  requestId: string;
  source: "PLATFORM" | "HUBSPOT" | "MOCK" | "TWILIO";
  metadata?: Record<string, boolean | number | string | null>;
}

/**
 * Audit events are persisted with tenant and client-account scope. Metadata is
 * limited to operational values, never credentials or raw CRM payloads.
 */
export async function recordAuditEvent(context: RequestContext, event: AuditEvent) {
  await prisma.auditLog.create({
    data: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
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
