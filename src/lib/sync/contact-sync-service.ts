import { AppError } from "@/lib/errors/app-error";
import { getCrmAdapter } from "@/lib/integrations/registry";
import type { NormalizedContact } from "@/lib/models/contact";
import type { RequestContext } from "@/lib/models/canonical";
import { prisma } from "@/lib/db/prisma";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { ensureDevelopmentTenant } from "@/lib/sync/development-bootstrap";

export interface ContactSyncSummary {
  contacts: NormalizedContact[];
  recordsRead: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  runs: Array<{
    id: string;
    provider: string;
    status: "COMPLETED" | "FAILED";
    error?: string;
  }>;
}

async function assertClientAccess(context: RequestContext) {
  await ensureDevelopmentTenant(context);

  const assignment = await prisma.clientAssignment.findFirst({
    where: {
      clientAccountId: context.activeClientAccountId,
      userId: context.user.id,
      clientAccount: { organizationId: context.user.organizationId },
    },
  });

  if (!assignment) {
    throw new AppError(
      "CLIENT_CONTEXT_REQUIRED",
      403,
      "The active client account is not assigned to the current agent.",
      "You do not have access to the selected client account.",
    );
  }
}

async function persistContacts(
  context: RequestContext,
  connectionId: string,
  contacts: NormalizedContact[],
) {
  let recordsCreated = 0;
  let recordsUpdated = 0;

  await prisma.$transaction(async (transaction) => {
    for (const contact of contacts) {
      const existing = await transaction.externalRecord.findUnique({
        where: {
          connectionId_externalId: {
            connectionId,
            externalId: contact.id,
          },
        },
      });

      const data = {
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email || null,
        phone: contact.phone || null,
        company: contact.company || null,
      };

      if (existing) {
        await transaction.contact.update({ where: { id: existing.contactId }, data });
        await transaction.externalRecord.update({
          where: { id: existing.id },
          data: { lastSyncedAt: new Date() },
        });
        recordsUpdated += 1;
        continue;
      }

      await transaction.contact.create({
        data: {
          organizationId: context.user.organizationId,
          clientAccountId: context.activeClientAccountId,
          ...data,
          externalRecords: {
            create: {
              clientAccountId: context.activeClientAccountId,
              connectionId,
              externalId: contact.id,
              lastSyncedAt: new Date(),
            },
          },
        },
      });
      recordsCreated += 1;
    }
  });

  return { recordsCreated, recordsUpdated };
}

/** Manually syncs every connected CRM attached to the active client account. */
export async function syncActiveClientContacts(
  context: RequestContext,
  requestId: string,
): Promise<ContactSyncSummary> {
  await assertClientAccess(context);

  const connections = await prisma.crmConnection.findMany({
    where: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      status: "CONNECTED",
    },
    orderBy: { provider: "asc" },
  });

  if (connections.length === 0) {
    throw new AppError(
      "SYNC_CONNECTION_NOT_FOUND",
      409,
      "No connected CRM was found for the active client account.",
      "Connect a CRM for the selected client account before syncing.",
    );
  }

  const summary: ContactSyncSummary = {
    contacts: [],
    recordsRead: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    runs: [],
  };

  for (const connection of connections) {
    const syncRun = await prisma.syncRun.create({
      data: {
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
        connectionId: connection.id,
        userId: context.user.id,
        provider: connection.provider,
        trigger: "MANUAL",
        status: "RUNNING",
      },
    });

    await recordAuditEvent(context, {
      action: "CONTACT_SYNC_STARTED",
      entityType: "SYNC_RUN",
      entityId: syncRun.id,
      requestId,
      source: "PLATFORM",
      metadata: { provider: connection.provider },
    });

    try {
      const contacts = await getCrmAdapter(connection.provider).listContacts({ limit: 100 });
      const persisted = await persistContacts(context, connection.id, contacts);

      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "COMPLETED",
          recordsRead: contacts.length,
          recordsCreated: persisted.recordsCreated,
          recordsUpdated: persisted.recordsUpdated,
          completedAt: new Date(),
        },
      });

      await recordAuditEvent(context, {
        action: "CONTACT_SYNC_COMPLETED",
        entityType: "SYNC_RUN",
        entityId: syncRun.id,
        requestId,
        source: connection.provider === "HUBSPOT" ? "HUBSPOT" : "MOCK",
        metadata: {
          provider: connection.provider,
          recordsRead: contacts.length,
          recordsCreated: persisted.recordsCreated,
          recordsUpdated: persisted.recordsUpdated,
        },
      });

      summary.contacts.push(...contacts);
      summary.recordsRead += contacts.length;
      summary.recordsCreated += persisted.recordsCreated;
      summary.recordsUpdated += persisted.recordsUpdated;
      summary.runs.push({ id: syncRun.id, provider: connection.provider, status: "COMPLETED" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "CRM sync failed.";
      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: { status: "FAILED", recordsFailed: 1, errorMessage: message, completedAt: new Date() },
      });
      await recordAuditEvent(context, {
        action: "CONTACT_SYNC_FAILED",
        entityType: "SYNC_RUN",
        entityId: syncRun.id,
        requestId,
        source: connection.provider === "HUBSPOT" ? "HUBSPOT" : "MOCK",
        metadata: { provider: connection.provider },
      });

      summary.recordsFailed += 1;
      summary.runs.push({
        id: syncRun.id,
        provider: connection.provider,
        status: "FAILED",
        error: "The CRM sync failed. Review sync history and retry manually.",
      });
    }
  }

  if (summary.runs.every((run) => run.status === "FAILED")) {
    throw new AppError(
      "SYNC_FAILED",
      502,
      "All CRM sync runs failed.",
      "The sync could not be completed. Review sync history and retry manually.",
    );
  }

  return summary;
}

export async function getActiveClientSyncHistory(context: RequestContext) {
  await assertClientAccess(context);

  return prisma.syncRun.findMany({
    where: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
    },
    orderBy: { startedAt: "desc" },
    take: 25,
    select: {
      id: true,
      provider: true,
      trigger: true,
      status: true,
      recordsRead: true,
      recordsCreated: true,
      recordsUpdated: true,
      recordsFailed: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
    },
  });
}
