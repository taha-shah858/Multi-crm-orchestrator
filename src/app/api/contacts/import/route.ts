import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import {
  prepareActiveClientSync,
  syncAgencyHubSpotContacts,
} from "@/lib/sync/contact-sync-service";

/**
 * GET /api/contacts/import
 * Unified Lead Directory import: the agency-owned HubSpot connection only.
 * The selected client supplies authorized work context, not a CRM source.
 */
export const dynamic = "force-dynamic";

async function handleManualSync(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    await prepareActiveClientSync(context);

    await recordAuditEvent(context, {
      action: "CONTACT_IMPORT_REQUESTED",
      entityType: "CONTACT",
      requestId,
      source: "PLATFORM",
    });

    const sync = await syncAgencyHubSpotContacts(context, requestId);

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
