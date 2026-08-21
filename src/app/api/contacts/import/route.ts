import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { getCrmAdapter } from "@/lib/integrations/registry";

/**
 * GET /api/contacts/import
 * Backend endpoint to fetch contacts from HubSpot CRM, normalize them into our
 * canonical NormalizedContact format, and return them to the caller.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = requireRequestContext(request);
    recordAuditEvent(context, {
      action: "CONTACT_IMPORT_REQUESTED",
      entityType: "CONTACT",
      requestId,
      source: "PLATFORM",
    });

    const contacts = await getCrmAdapter("HUBSPOT").listContacts({ limit: 100 });

    recordAuditEvent(context, {
      action: "CONTACT_IMPORT_COMPLETED",
      entityType: "CONTACT",
      requestId,
      source: "HUBSPOT",
      metadata: { count: contacts.length },
    });

    return success({ count: contacts.length, contacts }, requestId);
  });
}
