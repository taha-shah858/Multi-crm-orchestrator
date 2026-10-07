import { calendarAdapterFor, type SupportedCalendarProvider } from "@/lib/calendar/calendar-adapters";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";
import { isRemoteCalendarProvider } from "@/lib/calendar/calendar-types";
import { requireCalendarAgent } from "@/lib/calendar/calendar-connections";
import { appointmentInclude, syncCalendarAppointment } from "@/lib/calendar/calendar-sync-service";

type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "CANCELLED";
type AppointmentInput = Record<string, unknown>;

const providers = ["MANUAL", "MOCK", "GOOGLE", "OUTLOOK", "CALENDLY"] as const;
const statuses = ["SCHEDULED", "CONFIRMED", "CANCELLED"] as const;
const schedulingLanguage = /\b(schedule|scheduling|calendar|book(?:ing)?|meet(?:ing)?|available|availability|time works|time slot|thursday|friday|monday|tuesday|wednesday)\b/i;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function date(value: unknown, field: string) {
  const parsed = new Date(text(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid appointment time.", `Enter a valid ${field}.`);
  }
  return parsed;
}

function provider(value: unknown): SupportedCalendarProvider {
  if (value === undefined || value === null || value === "") return "MANUAL";
  if (providers.includes(value as SupportedCalendarProvider)) return value as SupportedCalendarProvider;
  throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid calendar provider.", "Choose an available calendar provider.");
}

function status(value: unknown): AppointmentStatus {
  if (statuses.includes(value as AppointmentStatus)) return value as AppointmentStatus;
  throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid appointment status.", "Choose a valid appointment status.");
}

function meetingTimeZone(value: unknown) {
  const timeZone = text(value) || "UTC";
  try { new Intl.DateTimeFormat("en", { timeZone }).format(); } catch { throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid meeting time zone.", "Choose a valid meeting time zone."); }
  return timeZone;
}

export function detectSchedulingIntent(subject: string | null, body: string) {
  const content = `${subject ?? ""} ${body}`.replace(/\s+/g, " ").trim();
  if (!schedulingLanguage.test(content)) return null;
  return "Scheduling language detected. Confirm the date and time before creating the meeting.";
}

async function validateLinks(context: RequestContext, input: AppointmentInput) {
  const contactId = text(input.contactId) || null;
  const interactionId = text(input.interactionId) || null;
  const [contact, interaction] = await Promise.all([
    contactId ? prisma.contact.findFirst({ where: { id: contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, firstName: true, lastName: true, email: true } }) : null,
    interactionId ? prisma.interaction.findFirst({ where: { id: interactionId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, contactId: true, subject: true, body: true, metadata: true } }) : null,
  ]);
  if (contactId && !contact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  if (interactionId && !interaction) throw new AppError("INTERACTION_NOT_FOUND", 404, "Interaction is outside active client.", "Choose an interaction from the active client account.");
  if (contact && interaction?.contactId && contact.id !== interaction.contactId) throw new AppError("APPOINTMENT_LINK_MISMATCH", 422, "Contact and interaction do not match.", "Use the contact associated with the selected interaction.");
  const linkedContact = contact ?? (interaction?.contactId ? await prisma.contact.findFirst({ where: { id: interaction.contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, firstName: true, lastName: true, email: true } }) : null);
  return { contact: linkedContact, interaction, contactId: linkedContact?.id ?? null, interactionId };
}

export async function listCalendarWorkspace(context: RequestContext) {
  await prepareActiveClientSync(context);
  const where = { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId };
  const [appointments, interactions] = await Promise.all([
    prisma.appointment.findMany({ where, include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } }, interaction: { select: { id: true, subject: true, occurredAt: true } } }, orderBy: { startTime: "asc" }, take: 100 }),
    prisma.interaction.findMany({ where, include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } } }, orderBy: { occurredAt: "desc" }, take: 100 }),
  ]);
  const scheduledInteractionIds = new Set(appointments.flatMap((appointment) => appointment.interactionId ? [appointment.interactionId] : []));
  const intents = interactions.flatMap((interaction) => {
    const metadata = interaction.metadata as { schedulingAnalysis?: { agreed: boolean; evidence: string; proposedTime: string | null; startTime: string | null; durationMinutes: number; timeZone: string } } | null;
    const analysis = metadata?.schedulingAnalysis;
    const reason = analysis ? (analysis.agreed ? analysis.evidence : null) : detectSchedulingIntent(interaction.subject, interaction.body);
    return reason && !scheduledInteractionIds.has(interaction.id) ? [{ id: interaction.id, contactId: interaction.contactId, subject: interaction.subject, body: interaction.body, occurredAt: interaction.occurredAt, contact: interaction.contact, reason, analysis }] : [];
  });
  // Calendly cancellation/reschedule links are capabilities: sharing them would
  // let another agent change the booking outside the app's owner check.
  return { appointments: appointments.map(appointment => isRemoteCalendarProvider(appointment.provider) && appointment.userId !== context.user.id ? { ...appointment, externalMetadata: null } : appointment), intents };
}

export async function createAppointment(context: RequestContext, input: AppointmentInput, requestId: string) {
  await prepareActiveClientSync(context);
  const title = text(input.title);
  const startTime = date(input.startTime, "start time");
  const endTime = date(input.endTime, "end time");
  if (!title || endTime <= startTime) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid appointment details.", "Enter a title and an end time after the start time.");
  const selectedProvider = provider(input.provider);
  const links = await validateLinks(context, input);
  const remote = isRemoteCalendarProvider(selectedProvider);
  if (remote) requireCalendarAgent(context.user);
  const connection = remote ? await prisma.calendarConnection.findFirst({ where: { organizationId: context.user.organizationId, userId: context.user.id, provider: selectedProvider, status: "CONNECTED" } }) : null;
  if (remote && !connection) throw new AppError("CALENDAR_PROVIDER_UNAVAILABLE", 422, "Calendar is not connected.", "Connect this calendar first or choose the manual calendar.");
  const sendInvite = remote && input.sendInvite === true;
  const attendeeEmail = links.contact?.email?.trim() ?? null;
  if (sendInvite && (!attendeeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail))) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Contact has no valid invitation email.", "Choose a contact with a valid email before sending an invitation.");
  if (selectedProvider === "CALENDLY" && (!sendInvite || !text(input.calendlyEventTypeUri))) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Calendly booking details are required.", "Choose a Calendly event type and confirm sending the contact an invitation.");
  const timeZone = meetingTimeZone(input.timeZone);
  const adapter = remote ? null : calendarAdapterFor(selectedProvider);
  const external = adapter ? await adapter.createEvent({ title, startTime, endTime }) : null;
  const intentDetected = Boolean(links.interaction && ((links.interaction.metadata as { schedulingAnalysis?: { agreed?: boolean } } | null)?.schedulingAnalysis?.agreed || detectSchedulingIntent(links.interaction.subject, links.interaction.body)));
  const appointment = await prisma.$transaction(async tx => {
    const created = await tx.appointment.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: links.contactId, interactionId: links.interactionId, userId: context.user.id, title, description: text(input.description) || null, startTime, endTime, provider: selectedProvider, source: intentDetected ? "INTENT_DETECTED" : "MANUAL", intentDetected, externalId: external?.externalId, externalMetadata: external?.metadata, calendarConnectionId: connection?.id, externalAccountId: connection?.providerAccountId, calendarSyncStatus: remote ? "PENDING" : "LOCAL_ONLY", sendInvite, attendeeEmail: sendInvite ? attendeeEmail : null, attendeeName: links.contact ? `${links.contact.firstName} ${links.contact.lastName}` : null, timeZone, calendlyEventTypeUri: selectedProvider === "CALENDLY" ? text(input.calendlyEventTypeUri) : null }, include: appointmentInclude });
    await tx.auditLog.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, userId: context.user.id, action: "APPOINTMENT_CREATED", entityType: "APPOINTMENT", entityId: created.id, requestId, source: "PLATFORM", metadata: { provider: created.provider, source: created.source, intentDetected } } });
    return created;
  });
  return remote ? syncCalendarAppointment(context, appointment.id, requestId) : appointment;
}

export async function updateAppointment(context: RequestContext, id: string, input: AppointmentInput, requestId: string) {
  await prepareActiveClientSync(context);
  const scope = { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId };
  const appointment = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Appointment" WHERE "id" = ${id} FOR UPDATE`;
    const existing = await tx.appointment.findFirst({ where: scope });
    if (!existing) throw new AppError("APPOINTMENT_NOT_FOUND", 404, "Appointment is outside active client.", "Choose an appointment from the active client account.");
    const remote = isRemoteCalendarProvider(existing.provider);
    if (remote && (context.user.role !== "AGENT" || existing.userId !== context.user.id)) throw new AppError("FORBIDDEN", 403, "Calendar meeting belongs to another agent.", "Only the booking agent can change this external meeting.");
    const startTime = input.startTime === undefined ? existing.startTime : date(input.startTime, "start time");
    const endTime = input.endTime === undefined ? existing.endTime : date(input.endTime, "end time");
    const title = input.title === undefined ? existing.title : text(input.title);
    if (!title || endTime <= startTime) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid appointment details.", "Enter a title and an end time after the start time.");
    const nextStatus = input.status === undefined ? existing.status : status(input.status);
    if (remote && existing.status === "CANCELLED" && nextStatus !== "CANCELLED") throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Cannot reopen a cancelled external booking.", "Create a new meeting to book another time.");
    const description = input.description === undefined ? existing.description : text(input.description) || null;
    if (existing.provider === "CALENDLY" && existing.externalId && (startTime.getTime() !== existing.startTime.getTime() || endTime.getTime() !== existing.endTime.getTime() || title !== existing.title || description !== existing.description)) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Calendly does not edit bookings through this endpoint.", "Use the Calendly reschedule link, then refresh the meeting here.");
    const adapter = remote ? null : calendarAdapterFor(existing.provider as SupportedCalendarProvider);
    if (adapter && existing.externalId) {
      if (nextStatus === "CANCELLED") await adapter.cancelEvent(existing.externalId);
      else await adapter.updateEvent(existing.externalId, { title, startTime, endTime });
    }
    const updated = await tx.appointment.update({ where: { id }, data: { title, description, startTime, endTime, status: nextStatus, ...(remote ? { calendarSyncStatus: existing.calendarSyncStatus === "REVIEW_REQUIRED" && !existing.externalId ? "REVIEW_REQUIRED" : "PENDING" } : {}) }, include: appointmentInclude });
    const action = nextStatus === "CANCELLED" && existing.status !== "CANCELLED" ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_UPDATED";
    await tx.auditLog.create({ data: { organizationId: existing.organizationId, clientAccountId: existing.clientAccountId, userId: context.user.id, action, entityType: "APPOINTMENT", entityId: id, requestId, source: "PLATFORM", metadata: { status: updated.status, provider: updated.provider } } });
    return updated;
  });
  // Review-required Calendly creates cannot be replayed, even by changing status.
  return isRemoteCalendarProvider(appointment.provider) && appointment.calendarSyncStatus !== "REVIEW_REQUIRED" ? syncCalendarAppointment(context, id, requestId) : appointment;
}
