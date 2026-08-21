import type { RequestContext } from "@/lib/models/canonical";

export interface AuditEvent {
  action: "CONTACT_IMPORT_REQUESTED" | "CONTACT_IMPORT_COMPLETED";
  entityType: "CONTACT";
  requestId: string;
  source: "PLATFORM" | "HUBSPOT";
  metadata?: Record<string, boolean | number | string | null>;
}

/**
 * Phase 1 audit boundary. The database schema is ready for persistence; this
 * safe structured log keeps events traceable until repositories arrive in Phase 2.
 */
export function recordAuditEvent(context: RequestContext, event: AuditEvent) {
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
