import "server-only";
import { createHash } from "crypto";
import type { Appointment } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import type { RemoteCalendarProvider, CalendlyEventType } from "@/lib/calendar/calendar-types";

export class CalendarRequestError extends AppError {
  constructor(message: string, public readonly uncertain = false, public readonly httpStatus?: number) { super("CALENDAR_SYNC_FAILED", 502, message, message); }
}
const origins = { GOOGLE: "https://www.googleapis.com/calendar/v3", OUTLOOK: "https://graph.microsoft.com/v1.0", CALENDLY: "https://api.calendly.com" };
export async function calendarRequest(provider: RemoteCalendarProvider, token: string, path: string, method = "GET", body?: unknown, allowMissing = false) {
  let response: Response;
  try {
    response = await fetch(`${origins[provider]}${path}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(provider === "OUTLOOK" ? { Prefer: 'IdType="ImmutableId", outlook.timezone="UTC"' } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch { throw new CalendarRequestError("The calendar response was not received. Check the provider before retrying this booking.", method !== "GET"); }
  if (allowMissing && [404, 410].includes(response.status)) return null;
  if (!response.ok) {
    const message = response.status === 401 ? "Calendar authorization expired. Reconnect the calendar." : response.status === 429 ? "The calendar is busy. Retry after the provider's rate limit clears." : provider === "CALENDLY" && response.status === 403 ? "Calendly direct booking requires a paid plan and booking permissions. Use the scheduling link or manual calendar." : response.status === 400 || response.status === 422 ? "The calendar rejected these meeting details. Check the time slot and event type." : "The calendar could not save this meeting. Your local meeting is retained.";
    throw new CalendarRequestError(message, method !== "GET" && response.status >= 500, response.status);
  }
  if (response.status === 204 || method === "DELETE") return null;
  try { return await response.json(); } catch { throw new CalendarRequestError("The calendar returned an incomplete response. Check the provider before retrying.", method !== "GET"); }
}
export function safeCalendarUrl(value: unknown, provider: RemoteCalendarProvider): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const allowed = provider === "GOOGLE" ? ["calendar.google.com", "www.google.com"] : provider === "OUTLOOK" ? ["outlook.office.com", "outlook.office365.com", "outlook.live.com"] : ["calendly.com"];
    return url.protocol === "https:" && !url.username && !url.password && allowed.includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}
export function calendlyResourcePath(uri: string, resource: "event_types" | "scheduled_events") {
  const match = uri.match(new RegExp(`^https://api\\.calendly\\.com/${resource}/([a-zA-Z0-9-]+)$`));
  if (!match) throw new AppError("INVALID_APPOINTMENT_INPUT", 422, "Invalid Calendly reference.", "Choose an event type from your connected Calendly account.");
  return `/${resource}/${match[1]}`;
}
function calendlyInviteePath(uri: unknown) {
  const match = typeof uri === "string" ? uri.match(/^https:\/\/api\.calendly\.com\/(?:api\/v2\/)?scheduled_events\/([a-zA-Z0-9-]+)\/invitees\/([a-zA-Z0-9-]+)$/) : null;
  if (!match) throw new CalendarRequestError("Calendly returned an invalid invitee reference. Review the booking in Calendly.");
  return `/scheduled_events/${match[1]}/invitees/${match[2]}`;
}
export async function calendlyEventTypes(token: string, accountId: string): Promise<CalendlyEventType[]> {
  const result = await calendarRequest("CALENDLY", token, `/event_types?${new URLSearchParams({ user: accountId, active: "true", count: "100" })}`);
  return (Array.isArray(result?.collection) ? result.collection : []).filter((item: { active?: boolean; kind?: string; profile?: { owner?: string } }) => item.active && item.kind === "solo" && item.profile?.owner === accountId).map((item: { uri: string; name: string; duration: number; scheduling_url?: string }) => ({ uri: item.uri, name: item.name, duration: item.duration, schedulingUrl: safeCalendarUrl(item.scheduling_url, "CALENDLY") }));
}
function eventPayload(provider: "GOOGLE" | "OUTLOOK", appointment: Appointment) {
  const { title, description, startTime, endTime, attendeeEmail, attendeeName, sendInvite } = appointment;
  const attendees = sendInvite && attendeeEmail ? [{ email: attendeeEmail, displayName: attendeeName ?? undefined }] : [];
  if (provider === "GOOGLE") return { summary: title, description: description ?? "", start: { dateTime: startTime.toISOString() }, end: { dateTime: endTime.toISOString() }, attendees, extendedProperties: { private: { platformAppointment: appointment.id } } };
  return { subject: title, body: { contentType: "text", content: description ?? "" }, start: { dateTime: startTime.toISOString().replace(/Z$/, ""), timeZone: "UTC" }, end: { dateTime: endTime.toISOString().replace(/Z$/, ""), timeZone: "UTC" }, attendees: attendees.map(item => ({ emailAddress: { address: item.email, name: item.displayName }, type: "required" })) };
}
function remoteId(result: unknown) {
  const value = (result as { id?: unknown } | null)?.id;
  if (typeof value !== "string" || !value) throw new CalendarRequestError("The calendar did not return a meeting ID. Check the provider before retrying.", true);
  return value;
}
export async function pushCalendarAppointment(provider: RemoteCalendarProvider, token: string, accountId: string, appointment: Appointment) {
  const metadata = (appointment.externalMetadata ?? {}) as Record<string, string | null>;
  let externalId = appointment.externalId;
  if (appointment.status === "CANCELLED") {
    if (externalId) {
      if (provider === "CALENDLY") {
        const path = calendlyResourcePath(externalId, "scheduled_events");
        try { await calendarRequest(provider, token, `${path}/cancellation`, "POST", { reason: "Cancelled in the sales workspace" }, true); }
        catch (error) {
          if (!(error instanceof CalendarRequestError) || ![400, 409, 422].includes(error.httpStatus ?? 0)) throw error;
          const current = await calendarRequest(provider, token, path, "GET", undefined, true);
          if (current && current.resource?.status !== "canceled") throw error;
        }
      }
      else await calendarRequest(provider, token, provider === "GOOGLE" ? `/calendars/primary/events/${encodeURIComponent(externalId)}?sendUpdates=${appointment.sendInvite ? "all" : "none"}` : `/me/events/${encodeURIComponent(externalId)}`, "DELETE", undefined, true);
    }
    return { externalId, metadata };
  }
  if (provider === "CALENDLY") {
    if (externalId) return { externalId, metadata }; // Confirming locally does not rebook.
    if (!appointment.sendInvite || !appointment.attendeeEmail || !appointment.calendlyEventTypeUri) throw new CalendarRequestError("Select a Calendly event type and confirm sending an invitation to the selected contact.");
    const eventPath = calendlyResourcePath(appointment.calendlyEventTypeUri, "event_types");
    const { resource } = await calendarRequest(provider, token, eventPath);
    if (!resource?.active || resource.kind !== "solo" || resource.profile?.owner !== accountId) throw new CalendarRequestError("Choose an active individual event type from your connected Calendly account.");
    if ((appointment.endTime.getTime() - appointment.startTime.getTime()) / 60000 !== resource.duration) throw new CalendarRequestError(`This Calendly event type lasts ${resource.duration} minutes. Adjust the end time before booking.`);
    if (resource.custom_questions?.some((question: { enabled?: boolean; required?: boolean }) => question.enabled && question.required)) throw new CalendarRequestError("This Calendly event requires additional answers. Use its scheduling link to complete the booking.");
    const result = await calendarRequest(provider, token, "/invitees", "POST", { event_type: appointment.calendlyEventTypeUri, start_time: appointment.startTime.toISOString(), invitee: { email: appointment.attendeeEmail, name: appointment.attendeeName ?? undefined, timezone: appointment.timeZone }, tracking: { utm_content: appointment.id } });
    const invitee = result?.resource;
    const eventUri = typeof invitee?.event === "string" ? invitee.event : typeof invitee?.uri === "string" ? invitee.uri.split("/invitees/")[0] : "";
    try { calendlyResourcePath(eventUri, "scheduled_events"); } catch { throw new CalendarRequestError("Calendly may have booked this meeting but returned an incomplete ID. Check Calendly before creating another booking.", true); }
    let inviteePath;
    try { inviteePath = calendlyInviteePath(invitee?.uri); }
    catch { throw new CalendarRequestError("Calendly may have booked this meeting but returned an incomplete invitee ID. Check Calendly before creating another booking.", true); }
    if (inviteePath.split("/invitees/")[0] !== calendlyResourcePath(eventUri, "scheduled_events")) throw new CalendarRequestError("Calendly returned inconsistent booking references. Check Calendly before creating another booking.", true);
    return { externalId: eventUri, metadata: { inviteeUri: `https://api.calendly.com${inviteePath}`, eventUrl: safeCalendarUrl(invitee?.cancel_url, provider), rescheduleUrl: safeCalendarUrl(invitee?.reschedule_url, provider), schedulingUrl: safeCalendarUrl(resource.scheduling_url, provider) } };
  }
  const body = eventPayload(provider, appointment);
  let result;
  if (externalId) result = await calendarRequest(provider, token, provider === "GOOGLE" ? `/calendars/primary/events/${encodeURIComponent(externalId)}?sendUpdates=${appointment.sendInvite ? "all" : "none"}` : `/me/events/${encodeURIComponent(externalId)}`, "PATCH", body);
  else if (provider === "GOOGLE") {
    const deterministicId = createHash("sha256").update(appointment.id).digest("hex");
    try { result = await calendarRequest(provider, token, `/calendars/primary/events?sendUpdates=${appointment.sendInvite ? "all" : "none"}`, "POST", { ...body, id: deterministicId }); }
    catch (error) {
      if (!(error instanceof CalendarRequestError) || error.httpStatus !== 409) throw error;
      // A lost create response can be recovered by its deterministic ID.
      result = await calendarRequest(provider, token, `/calendars/primary/events/${deterministicId}?sendUpdates=${appointment.sendInvite ? "all" : "none"}`, "PATCH", body);
    }
  } else result = await calendarRequest(provider, token, "/me/events", "POST", { ...body, transactionId: appointment.id });
  externalId = remoteId(result);
  return { externalId, metadata: { eventUrl: safeCalendarUrl(provider === "GOOGLE" ? result.htmlLink : result.webLink, provider) } };
}
export async function readCalendarAppointment(provider: RemoteCalendarProvider, token: string, appointment: Appointment) {
  if (!appointment.externalId) throw new CalendarRequestError("This meeting has no confirmed external booking yet.");
  let externalId = appointment.externalId;
  const metadata = { ...(appointment.externalMetadata ?? {}) as Record<string, string | null> };
  if (provider === "CALENDLY" && metadata.inviteeUri) {
    let path = calendlyInviteePath(metadata.inviteeUri);
    if (path.split("/invitees/")[0] !== calendlyResourcePath(externalId, "scheduled_events")) throw new CalendarRequestError("This Calendly invitee does not match the saved meeting.");
    // A reschedule creates a new event. Follow only this booking's invitee chain,
    // never a list of unrelated events from the agent's personal calendar.
    for (let hop = 0; hop < 3; hop++) {
      const response = await calendarRequest(provider, token, path);
      const invitee = response?.resource;
      if (typeof invitee?.email !== "string" || invitee.email.trim().toLowerCase() !== appointment.attendeeEmail?.trim().toLowerCase() || calendlyResourcePath(invitee?.event ?? "", "scheduled_events") !== path.split("/invitees/")[0]) throw new CalendarRequestError("The Calendly invitee does not match this meeting's contact.");
      if (invitee.rescheduled && invitee.new_invitee) {
        if (hop === 2) throw new CalendarRequestError("This meeting has several recent reschedules. Review its latest booking in Calendly before refreshing.");
        path = calendlyInviteePath(invitee.new_invitee);
        continue;
      }
      externalId = `https://api.calendly.com${path.split("/invitees/")[0]}`;
      metadata.inviteeUri = `https://api.calendly.com${path}`;
      metadata.eventUrl = safeCalendarUrl(invitee.cancel_url, provider);
      metadata.rescheduleUrl = safeCalendarUrl(invitee.reschedule_url, provider);
      break;
    }
  }
  const mapping = provider === "CALENDLY" ? { externalId, externalMetadata: metadata } : {};
  const result = await calendarRequest(provider, token, provider === "GOOGLE" ? `/calendars/primary/events/${encodeURIComponent(externalId)}` : provider === "OUTLOOK" ? `/me/events/${encodeURIComponent(externalId)}` : calendlyResourcePath(externalId, "scheduled_events"), "GET", undefined, true);
  if (!result) return { ...mapping, status: "CANCELLED" as const };
  const event = provider === "CALENDLY" ? result.resource : result;
  if (event.status === "cancelled" || event.status === "canceled" || event.isCancelled === true) return { ...mapping, status: "CANCELLED" as const };
  const start = provider === "CALENDLY" ? event.start_time : event.start?.dateTime;
  const end = provider === "CALENDLY" ? event.end_time : event.end?.dateTime;
  const parse = (value: unknown) => typeof value === "string" ? new Date(provider === "OUTLOOK" && !/Z$|[+-]\d\d:\d\d$/.test(value) ? `${value}Z` : value) : new Date(NaN);
  const startTime = parse(start), endTime = parse(end);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) throw new CalendarRequestError("This external event has unsupported or incomplete times. Review it in the provider calendar.");
  const title = provider === "GOOGLE" ? event.summary : provider === "OUTLOOK" ? event.subject : event.name;
  return { ...mapping, ...(typeof title === "string" && title ? { title } : {}), startTime, endTime, status: appointment.status === "CONFIRMED" ? "CONFIRMED" as const : "SCHEDULED" as const };
}
