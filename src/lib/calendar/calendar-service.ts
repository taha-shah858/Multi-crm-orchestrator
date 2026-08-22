import { recordAuditEvent } from "@/lib/audit/audit-log";
import { calendarAdapterFor, type SupportedCalendarProvider } from "@/lib/calendar/calendar-adapters";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";

type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "CANCELLED";
type AppointmentInput = Record<string, unknown>;

const providers = ["MANUAL", "MOCK", "GOOGLE", "OUTLOOK"] as const;
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

export function detectSchedulingIntent(subject: string | null, body: string) {
  const content = `${subject ?? ""} ${body}`.replace(/\s+/g, " ").trim();
  if (!schedulingLanguage.test(content)) return null;
  return "Scheduling language detected. Confirm the date and time before creating the meeting.";
}

async function validateLinks(context: RequestContext, input: AppointmentInput) {
  const contactId = text(input.contactId) || null;
  const interactionId = text(input.interactionId) || null;
  const [contact, interaction] = await Promise.all([
    contactId ? prisma.contact.findFirst({ where: { id: contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, firstName: true, lastName: true } }) : null,
    interactionId ? prisma.interaction.findFirst({ where: { id: interactionId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, contactId: true, subject: true, body: true } }) : null,
  ]);
  if (contactId && !contact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  if (interactionId && !interaction) throw new AppError("INTERACTION_NOT_FOUND", 404, "Interaction is outside active client.", "Choose an interaction from the active client account.");
  if (contact && interaction?.contactId && contact.id !== interaction.contactId) throw new AppError("APPOINTMENT_LINK_MISMATCH", 422, "Contact and interaction do not match.", "Use the contact associated with the selected interaction.");
  return { contact, interaction, contactId: contactId ?? interaction?.contactId ?? null, interactionId };
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
    const reason = detectSchedulingIntent(interaction.subject, interaction.body);
    return reason && !scheduledInteractionIds.has(interaction.id) ? [{ id: interaction.id, contactId: interaction.contactId, subject: interaction.subject, body: interaction.body, occurredAt: interaction.occurredAt, contact: interaction.contact, reason }] : [];
  });
  return { appointments, intents };
}

export async function createAppointment(context: RequestContext, input: AppointmentInput, requestId: string) {
  await prepareActiveClientSync(context);
  const title = text(input.title);
  const startTime = date(input.startTime, "start time");
  const endTime = date(input.endTime, "end time");
  if (!title || endTime <= startTime) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid appointment details.", "Enter a title and an end time after the start time.");
  const selectedProvider = provider(input.provider);
  const links = await validateLinks(context, input);
  const adapter = calendarAdapterFor(selectedProvider);
  const external = adapter ? await adapter.createEvent({ title, startTime, endTime }) : null;
  const intentDetected = Boolean(links.interaction && detectSchedulingIntent(links.interaction.subject, links.interaction.body));
  const appointment = await prisma.appointment.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: links.contactId, interactionId: links.interactionId, userId: context.user.id, title, description: text(input.description) || null, startTime, endTime, provider: selectedProvider, source: intentDetected ? "INTENT_DETECTED" : "MANUAL", intentDetected, externalId: external?.externalId, externalMetadata: external?.metadata }, include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } }, interaction: { select: { id: true, subject: true, occurredAt: true } } } });
  await recordAuditEvent(context, { action: "APPOINTMENT_CREATED", entityType: "APPOINTMENT", entityId: appointment.id, requestId, source: "PLATFORM", metadata: { provider: appointment.provider, source: appointment.source, intentDetected } });
  return appointment;
}

export async function updateAppointment(context: RequestContext, id: string, input: AppointmentInput, requestId: string) {
  await prepareActiveClientSync(context);
  const existing = await prisma.appointment.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } });
  if (!existing) throw new AppError("APPOINTMENT_NOT_FOUND", 404, "Appointment is outside active client.", "Choose an appointment from the active client account.");
  const startTime = input.startTime === undefined ? existing.startTime : date(input.startTime, "start time");
  const endTime = input.endTime === undefined ? existing.endTime : date(input.endTime, "end time");
  const title = input.title === undefined ? existing.title : text(input.title);
  if (!title || endTime <= startTime) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid appointment details.", "Enter a title and an end time after the start time.");
  const nextStatus = input.status === undefined ? existing.status : status(input.status);
  const adapter = calendarAdapterFor(existing.provider as SupportedCalendarProvider);
  if (adapter && existing.externalId) {
    if (nextStatus === "CANCELLED") await adapter.cancelEvent(existing.externalId);
    else await adapter.updateEvent(existing.externalId, { title, startTime, endTime });
  }
  const appointment = await prisma.appointment.update({ where: { id }, data: { title, description: input.description === undefined ? existing.description : text(input.description) || null, startTime, endTime, status: nextStatus }, include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } }, interaction: { select: { id: true, subject: true, occurredAt: true } } } });
  const action = nextStatus === "CANCELLED" && existing.status !== "CANCELLED" ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_UPDATED";
  await recordAuditEvent(context, { action, entityType: "APPOINTMENT", entityId: appointment.id, requestId, source: "PLATFORM", metadata: { status: appointment.status, provider: appointment.provider } });
  return appointment;
}
