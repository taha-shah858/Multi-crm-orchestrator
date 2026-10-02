import "server-only";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";
import { calendarAccessToken, requireCalendarAgent } from "./calendar-connections";
import { calendarRequest, calendlyResourcePath, safeCalendarUrl, CalendarRequestError } from "./calendar-provider-client";

export const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export interface AvailabilityRule { type: "wday" | "date"; wday?: string; date?: string; intervals: { from: string; to: string }[]; }
export interface CalendlyManagedType { uri: string; name: string; duration: number; description: string; active: boolean; schedulingUrl: string | null; }
export interface CalendlyAvailability { timezone: string; rules: AvailabilityRule[]; }
const invalid = (message: string) => new AppError("INVALID_APPOINTMENT_INPUT", 422, message, message);

// Keep rotated credentials even when the subsequent provider operation fails.
async function withCalendar<T>(context: RequestContext, operation: (token: string, accountId: string) => Promise<T>) {
  await prepareActiveClientSync(context); requireCalendarAgent(context.user);
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "CalendarConnection" WHERE "userId" = ${context.user.id} AND "organizationId" = ${context.user.organizationId} AND "provider" = 'CALENDLY' FOR UPDATE`;
    const connection = await tx.calendarConnection.findFirst({ where: { userId: context.user.id, organizationId: context.user.organizationId, provider: "CALENDLY", status: "CONNECTED" } });
    if (!connection) throw new AppError("CALENDAR_PROVIDER_UNAVAILABLE", 422, "Calendly is disconnected.", "Connect Calendly first.");
    const token = await calendarAccessToken(tx, connection, "CALENDLY");
    try { return { value: await operation(token, connection.providerAccountId) }; }
    catch (error) { return { error }; }
  }, { timeout: 40_000 });
  if ("error" in result) throw result.error;
  return result.value;
}

function summarize(resource: Record<string, unknown>): CalendlyManagedType {
  const uri = typeof resource.uri === "string" ? resource.uri : "";
  calendlyResourcePath(uri, "event_types");
  if (typeof resource.name !== "string" || !Number.isInteger(resource.duration)) throw new CalendarRequestError("Calendly returned incomplete event-type details. Refresh before trying again.");
  return { uri, name: resource.name, duration: resource.duration as number, description: typeof resource.description_plain === "string" ? resource.description_plain : "", active: resource.active === true, schedulingUrl: safeCalendarUrl(resource.scheduling_url, "CALENDLY") };
}
async function ownedType(token: string, accountId: string, uri: string) {
  const path = calendlyResourcePath(uri, "event_types");
  const result = await calendarRequest("CALENDLY", token, path);
  if (result?.resource?.profile?.owner !== accountId || result.resource.kind !== "solo" || result.resource.admin_managed) throw new AppError("FORBIDDEN", 403, "Event type cannot be managed by this agent.", "Choose your own individual event type. Organization-managed types must be changed in Calendly.");
  return result.resource;
}

export async function listManagedEventTypes(context: RequestContext) {
  return withCalendar(context, async (token, accountId) => {
    const items: CalendlyManagedType[] = [];
    let pageToken = "";
    for (let page = 0; page < 10; page++) {
      const query = new URLSearchParams({ user: accountId, count: "100", ...(pageToken ? { page_token: pageToken } : {}) });
      const result = await calendarRequest("CALENDLY", token, `/event_types?${query}`);
      for (const item of result?.collection ?? []) if (item.profile?.owner === accountId && item.kind === "solo" && !item.admin_managed) items.push(summarize(item));
      pageToken = result?.pagination?.next_page_token ?? "";
      if (!pageToken) return items;
    }
    throw new CalendarRequestError("There are too many event types to load at once. Manage the remaining types in Calendly.");
  });
}

export async function saveEventType(context: RequestContext, input: Record<string, unknown>, requestId: string) {
  const uri = typeof input.uri === "string" ? input.uri : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!name || name.length > 200 || description.length > 5000 || !Number.isInteger(input.duration) || (input.duration as number) < 1 || (input.duration as number) > 720 || typeof input.active !== "boolean") throw invalid("Enter a name, a duration from 1 to 720 minutes, and an active status.");
  const eventType = await withCalendar(context, async (token, accountId) => {
    if (uri) await ownedType(token, accountId, uri);
    const body = { name, description, duration: input.duration, active: input.active };
    let response;
    try { response = await calendarRequest("CALENDLY", token, uri ? calendlyResourcePath(uri, "event_types") : "/event_types", uri ? "PATCH" : "POST", uri ? body : { ...body, owner: accountId }); }
    catch (error) {
      if (!uri && error instanceof CalendarRequestError && error.uncertain) throw new CalendarRequestError("Calendly may have created this event type. Refresh the list and check for it before creating another.");
      if (error instanceof CalendarRequestError && error.httpStatus === 403) throw new CalendarRequestError("Calendly denied event-type access. Enable event_types:write and reconnect, or check your plan and account permissions.");
      throw error;
    }
    return summarize(response?.resource ?? {});
  });
  await prisma.auditLog.create({ data: { organizationId: context.user.organizationId, userId: context.user.id, action: uri ? "CALENDLY_EVENT_TYPE_UPDATED" : "CALENDLY_EVENT_TYPE_CREATED", entityType: "CALENDLY_EVENT_TYPE", entityId: eventType.uri, source: "PLATFORM", requestId } });
  return eventType;
}

export async function getEventTypeAvailability(context: RequestContext, uri: string) {
  return withCalendar(context, async (token, accountId) => {
    await ownedType(token, accountId, uri);
    const response = await calendarRequest("CALENDLY", token, `/event_type_availability_schedules?${new URLSearchParams({ event_type: uri })}`);
    const schedule = response?.collection?.find((item: { event_type?: string; availability_rule?: { user?: string } }) => item.event_type === uri && (!item.availability_rule?.user || item.availability_rule.user === accountId));
    if (!schedule?.availability_rule?.timezone || !Array.isArray(schedule.availability_rule.rules)) throw new CalendarRequestError("Calendly did not return an editable availability schedule. Review it in Calendly.");
    return { timezone: schedule.availability_rule.timezone, rules: schedule.availability_rule.rules } as CalendlyAvailability;
  });
}

export function validateAvailability(input: Record<string, unknown>): CalendlyAvailability {
  if (typeof input.timezone !== "string") throw invalid("Choose a valid availability time zone.");
  try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format(); } catch { throw invalid("Choose a valid availability time zone."); }
  if (!Array.isArray(input.rules) || input.rules.length > 100) throw invalid("Enter a valid availability schedule.");
  const keys = new Set<string>();
  const rules: AvailabilityRule[] = input.rules.map((rule: AvailabilityRule) => {
    if (!rule || !["wday", "date"].includes(rule.type)) throw invalid("Invalid availability rule.");
    const key = rule.type === "wday" ? rule.wday : rule.date;
    if (rule.type === "wday" ? !weekDays.includes(rule.wday as typeof weekDays[number]) : !rule.date || !/^\d{4}-\d{2}-\d{2}$/.test(rule.date) || Number.isNaN(Date.parse(rule.date)) || new Date(rule.date).toISOString().slice(0, 10) !== rule.date) throw invalid("Invalid availability day or date.");
    if (keys.has(`${rule.type}:${key}`)) throw invalid("Each day or date can appear only once.");
    keys.add(`${rule.type}:${key}`);
    if (!Array.isArray(rule.intervals) || rule.intervals.length > 10) throw invalid("Use at most ten time intervals per day.");
    let previousEnd = "";
    const intervals = rule.intervals.map(interval => {
      if (!interval || !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.from) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.to) || interval.from >= interval.to || interval.from < previousEnd) throw invalid("Availability times must be ordered, non-overlapping, and end after they start.");
      previousEnd = interval.to; return { from: interval.from, to: interval.to };
    });
    return { type: rule.type, ...(rule.type === "wday" ? { wday: rule.wday } : { date: rule.date }), intervals };
  });
  if (!weekDays.every(day => rules.some(rule => rule.type === "wday" && rule.wday === day))) throw invalid("Include all seven weekdays, using empty intervals for unavailable days.");
  return { timezone: input.timezone, rules };
}
export async function saveEventTypeAvailability(context: RequestContext, uri: string, input: Record<string, unknown>, requestId: string) {
  const schedule = validateAvailability(input);
  await withCalendar(context, async (token, accountId) => {
    await ownedType(token, accountId, uri);
    try { await calendarRequest("CALENDLY", token, `/event_type_availability_schedules?${new URLSearchParams({ event_type: uri })}`, "PATCH", { availability_rule: schedule, availability_setting: "host" }); }
    catch (error) {
      if (error instanceof CalendarRequestError && error.httpStatus === 403) throw new CalendarRequestError("Calendly denied availability access. Enable availability:read and availability:write and reconnect.");
      throw error;
    }
  });
  await prisma.auditLog.create({ data: { organizationId: context.user.organizationId, userId: context.user.id, action: "CALENDLY_AVAILABILITY_UPDATED", entityType: "CALENDLY_EVENT_TYPE", entityId: uri, source: "PLATFORM", requestId } });
  return schedule;
}
