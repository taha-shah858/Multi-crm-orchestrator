import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { syncActiveClientContacts } from "@/lib/sync/contact-sync-service";

/**
 * GET /api/contacts/import
 * Compatibility endpoint for the existing leads UI. Phase 2 turns its manual
 * import into a persisted sync for the active client account's CRM connection.
 */
export const dynamic = "force-dynamic";

async function handleManualSync(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = requireRequestContext(request);
    await recordAuditEvent(context, {
      action: "CONTACT_IMPORT_REQUESTED",
      entityType: "CONTACT",
      requestId,
      source: "PLATFORM",
    });

    const sync = await syncActiveClientContacts(context, requestId);

    await recordAuditEvent(context, {
      action: "CONTACT_IMPORT_COMPLETED",
      entityType: "CONTACT",
      requestId,
      source: "PLATFORM",
      metadata: {
        count: sync.contacts.length,
        recordsCreated: sync.recordsCreated,
        recordsUpdated: sync.recordsUpdated,
      },
    });

    return success({ count: sync.contacts.length, contacts: sync.contacts, sync }, requestId);
  });
}

export async function GET(request: NextRequest) {
  return handleManualSync(request);
}

export async function POST(request: NextRequest) {
  return handleManualSync(request);
}
