import "server-only";
import { prisma } from "@/lib/db/prisma";
import { AppError, isAppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";
import { calendarAccessToken, requireCalendarAgent } from "@/lib/calendar/calendar-connections";
import { calendlyEventTypes, CalendarRequestError, pushCalendarAppointment, readCalendarAppointment } from "@/lib/calendar/calendar-provider-client";
import { isRemoteCalendarProvider } from "@/lib/calendar/calendar-types";

export const appointmentInclude = { contact: { select: { id: true, firstName: true, lastName: true, company: true } }, interaction: { select: { id: true, subject: true, occurredAt: true } } } as const;

export async function listCalendlyEventTypes(context: RequestContext) {
  await prepareActiveClientSync(context); requireCalendarAgent(context.user);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "CalendarConnection" WHERE "userId" = ${context.user.id} AND "organizationId" = ${context.user.organizationId} AND "provider" = 'CALENDLY' FOR UPDATE`;
    const connection = await tx.calendarConnection.findFirst({ where: { userId: context.user.id, organizationId: context.user.organizationId, provider: "CALENDLY", status: "CONNECTED" } });
    if (!connection) throw new AppError("CALENDAR_PROVIDER_UNAVAILABLE", 422, "Calendly is disconnected.", "Connect Calendly to choose an event type.");
    const token = await calendarAccessToken(tx, connection, "CALENDLY");
    // Return a safe failure without rolling back a successfully rotated token.
    try { return { eventTypes: await calendlyEventTypes(token, connection.providerAccountId) }; }
    catch (error) { return { eventTypes: [], error: isAppError(error) ? error.safeMessage : "Calendly event types could not be loaded." }; }
  }, { timeout: 30_000 });
}

/** Local meeting is durable first. Serialize writes and catch failures inside the
 * transaction so refreshed credentials and visible failure state both commit. */
export async function syncCalendarAppointment(context: RequestContext, id: string, requestId: string, mode: "PUSH" | "PULL" = "PUSH") {
  await prepareActiveClientSync(context); requireCalendarAgent(context.user);
  const scope = { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, userId: context.user.id };
  const selected = await prisma.appointment.findFirst({ where: scope });
  if (!selected) throw new AppError("APPOINTMENT_NOT_FOUND", 404, "Appointment is outside this agent's active client.", "Choose a meeting you created for the active client.");
  if (!isRemoteCalendarProvider(selected.provider) || !selected.calendarConnectionId) throw new AppError("CALENDAR_PROVIDER_UNAVAILABLE", 422, "Meeting has no live calendar connection.", "This meeting uses the local calendar.");
  return prisma.$transaction(async tx => {
    // Lock order is always connection, then appointment.
    await tx.$queryRaw`SELECT "id" FROM "CalendarConnection" WHERE "id" = ${selected.calendarConnectionId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Appointment" WHERE "id" = ${id} FOR UPDATE`;
    const appointment = await tx.appointment.findFirstOrThrow({ where: scope });
    const provider = appointment.provider;
    if (!isRemoteCalendarProvider(provider)) throw new AppError("CALENDAR_PROVIDER_UNAVAILABLE", 422, "Local-only meeting.", "This meeting uses the local calendar.");
    if (mode === "PUSH" && appointment.calendarSyncStatus === "SYNCED") return tx.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
    if (provider === "CALENDLY" && appointment.calendarSyncStatus === "REVIEW_REQUIRED" && !appointment.externalId) throw new AppError("CALENDAR_SYNC_FAILED", 409, "Calendly booking outcome is unknown.", "Check Calendly before making another booking. Automatic rebooking is paused to avoid duplicates.");
    if (mode === "PULL" && appointment.calendarSyncStatus !== "SYNCED") throw new AppError("CALENDAR_SYNC_FAILED", 409, "Local changes are not synchronized.", "Save or retry your local changes before refreshing the external meeting.");
    try {
      const connection = await tx.calendarConnection.findFirst({ where: { id: appointment.calendarConnectionId!, organizationId: context.user.organizationId, userId: context.user.id, provider } });
      if (!connection || connection.providerAccountId !== appointment.externalAccountId) throw new CalendarRequestError("Reconnect the original calendar account for this meeting. Its external booking belongs to a different account.");
      const client = await tx.clientAccount.findFirst({ where: { id: context.activeClientAccountId, organizationId: context.user.organizationId, status: "ACTIVE", agentAssignments: { some: { userId: context.user.id } } } });
      if (!client) throw new AppError("CLIENT_ACCESS_DENIED", 403, "Client access revoked.", "Client access changed; calendar syncing is paused.");
      const token = await calendarAccessToken(tx, connection, provider);
      const result = mode === "PUSH" ? await pushCalendarAppointment(provider, token, connection.providerAccountId, appointment) : await readCalendarAppointment(provider, token, appointment);
      const updated = await tx.appointment.update({ where: { id }, data: { ...(mode === "PUSH" ? { externalId: (result as Awaited<ReturnType<typeof pushCalendarAppointment>>).externalId, externalMetadata: (result as Awaited<ReturnType<typeof pushCalendarAppointment>>).metadata } : result as Awaited<ReturnType<typeof readCalendarAppointment>>), calendarSyncStatus: "SYNCED", lastSyncError: null, lastSyncedAt: new Date() }, include: appointmentInclude });
      await tx.auditLog.create({ data: { organizationId: appointment.organizationId, clientAccountId: appointment.clientAccountId, userId: context.user.id, action: "APPOINTMENT_SYNC_COMPLETED", entityType: "APPOINTMENT", entityId: id, source: "PLATFORM", requestId, metadata: { provider, mode } } });
      return updated;
    } catch (error) {
      const review = provider === "CALENDLY" && !appointment.externalId && error instanceof CalendarRequestError && error.uncertain;
      const lastSyncError = isAppError(error) ? error.safeMessage : "Calendar sync did not finish. Your local meeting is retained.";
      const updated = await tx.appointment.update({ where: { id }, data: { calendarSyncStatus: review ? "REVIEW_REQUIRED" : "FAILED", lastSyncError }, include: appointmentInclude });
      await tx.auditLog.create({ data: { organizationId: appointment.organizationId, clientAccountId: appointment.clientAccountId, userId: context.user.id, action: "APPOINTMENT_SYNC_FAILED", entityType: "APPOINTMENT", entityId: id, source: "PLATFORM", requestId, metadata: { provider, mode, reviewRequired: review } } });
      return updated;
    }
  }, { timeout: 60_000, maxWait: 10_000 });
}
