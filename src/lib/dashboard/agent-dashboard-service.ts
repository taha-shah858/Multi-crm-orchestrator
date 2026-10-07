import "server-only";
import { prisma } from "@/lib/db/prisma";
import { listAccessibleClientAccounts } from "@/lib/auth/auth-service";
import type { AuthenticatedUser } from "@/lib/models/canonical";
import { AppError } from "@/lib/errors/app-error";

/** Read-only overview: no implicit provider sync or credential exposure. */
export async function getAgentDashboard(user: AuthenticatedUser, now = new Date()) {
  if (user.role !== "AGENT") throw new AppError("FORBIDDEN", 403, "Agent access required.", "Open your administrator workspace.");
  const clients = await listAccessibleClientAccounts(user);
  const clientIds = clients.map(client => client.id);
  const scope = { organizationId: user.organizationId, userId: user.id, clientAccountId: { in: clientIds } };
  const dayStart = new Date(now); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const [agencyLeads, callsToday, analyses, closedDeals, connections, calendars, appointments, interactions] = await Promise.all([
    clientIds.length ? prisma.contact.count({ where: { organizationId: user.organizationId, externalRecords: { some: { objectType: "CONTACT", connection: { organizationId: user.organizationId, ownershipType: "COMPANY", provider: "HUBSPOT" } } } } }) : Promise.resolve(0),
    prisma.interaction.count({ where: { ...scope, type: "CALL", direction: "OUTBOUND", occurredAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.leadAnalysis.count({ where: scope }),
    prisma.deal.count({ where: { organizationId: user.organizationId, clientAccountId: { in: clientIds }, status: "CLOSED_WON", OR: [{ userId: user.id }, { userId: null, handoffs: { some: { agentId: user.id } } }] } }),
    clientIds.length ? prisma.integrationConnection.findMany({ where: { organizationId: user.organizationId, OR: [{ ownershipType: "COMPANY", provider: "HUBSPOT" }, { ownershipType: "CLIENT_ACCOUNT", clientAccountId: { in: clientIds }, provider: "ZOHO" }, { ownershipType: "USER", userId: user.id, provider: "CLICKUP" }] }, select: { id: true, provider: true, ownershipType: true, status: true, lastSyncAt: true, clientAccount: { select: { name: true } } }, orderBy: { provider: "asc" } }) : Promise.resolve([]),
    prisma.calendarConnection.findMany({ where: { organizationId: user.organizationId, userId: user.id }, select: { id: true, provider: true, status: true } }),
    prisma.appointment.findMany({ where: { ...scope, startTime: { gte: now }, status: { not: "CANCELLED" } }, select: { id: true, title: true, startTime: true, provider: true, calendarSyncStatus: true, clientAccount: { select: { name: true } } }, orderBy: { startTime: "asc" }, take: 5 }),
    prisma.interaction.findMany({ where: scope, select: { id: true, subject: true, type: true, source: true, occurredAt: true, clientAccount: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 6 }),
  ]);
  return { updatedAt: now.toISOString(), clients, metrics: { agencyLeads, callsToday, analyses, closedDeals }, connections, calendars, appointments, interactions };
}
