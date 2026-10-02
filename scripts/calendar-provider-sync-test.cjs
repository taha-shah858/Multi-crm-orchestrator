// Real disposable database fixtures; all calendar HTTP traffic is controlled here.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const assert = require("node:assert/strict");
const { createHash, randomUUID, randomBytes } = require("node:crypto");
const ts = require("typescript"), root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env.local"), quiet: true });
process.env.NODE_ENV = "test";
process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString("base64");
for (const prefix of ["GOOGLE_CALENDAR", "OUTLOOK_CALENDAR", "CALENDLY"]) {
  process.env[`${prefix}_CLIENT_ID`] = "local-calendar-test";
  process.env[`${prefix}_CLIENT_SECRET`] = "disposable-secret";
  process.env[`${prefix}_REDIRECT_URI`] = `http://localhost:3005/api/calendar/connections/${prefix === "GOOGLE_CALENDAR" ? "GOOGLE" : prefix === "OUTLOOK_CALENDAR" ? "OUTLOOK" : "CALENDLY"}/callback`;
}
console.info = () => {};
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function(request, parent, isMain, options) { return resolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, parent, isMain, options); };
Module._load = function(request, parent, isMain) { return request === "server-only" ? {} : load.call(this, request, parent, isMain); };
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const { NextRequest } = require("next/server");
const { prisma } = require("../src/lib/db/prisma.ts");
const { encryptIntegrationSecret, decryptIntegrationSecret } = require("../src/lib/integrations/credential-crypto.ts");
const { beginCalendarConnection, completeCalendarConnection, disconnectCalendar, listCalendarConnections } = require("../src/lib/calendar/calendar-connections.ts");
const { createAppointment, updateAppointment, listCalendarWorkspace } = require("../src/lib/calendar/calendar-service.ts");
const { syncCalendarAppointment, listCalendlyEventTypes } = require("../src/lib/calendar/calendar-sync-service.ts");
const { safeCalendarUrl } = require("../src/lib/calendar/calendar-provider-client.ts");
const { listManagedEventTypes, saveEventType, getEventTypeAvailability, saveEventTypeAvailability, validateAvailability } = require("../src/lib/calendar/calendly-event-types.ts");
const routes = Object.fromEntries(["connections", "connections/[provider]/connect", "connections/[provider]/callback", "connections/[provider]/disconnect", "events/[id]/sync", "schedule", "events"].map(name => [name, require(`../src/app/api/calendar/${name}/route.ts`)]));
const marker = `calendar-${Date.now()}`;
const ids = { org: marker, foreign: `${marker}-foreign`, agent: `${marker}-agent`, other: `${marker}-other`, admin: `${marker}-admin`, client: `${marker}-client`, denied: `${marker}-denied`, contact: `${marker}-contact` };
const user = { id: ids.agent, organizationId: ids.org, name: "Calendar Agent", email: `${marker}@example.test`, role: "AGENT" };
const context = { user, activeClientAccountId: ids.client }, otherContext = { user: { ...user, id: ids.other }, activeClientAccountId: ids.client };
const eventTypeUri = "https://api.calendly.com/event_types/solo-test";
const calls = [], remoteEvents = new Map(), remoteInvitees = new Map();
const managedTypes = new Map();
const schedules = new Map();
let failTypeCreate = false;
let checks = 0, failCreate = null, googleSubject = "google-account", refreshes = 0, pauseToken = null;
const json = (data, status = 200) => Response.json(data, { status });
global.fetch = async (url, options = {}) => {
  const address = new URL(url), method = options.method ?? "GET";
  const body = options.body ? JSON.parse(typeof options.body === "string" ? options.body : "null") : null;
  // Token request bodies are URLSearchParams rather than JSON.
  calls.push({ url: address.toString(), method, body, headers: options.headers });
  if (address.pathname.endsWith("/token")) {
    const values = Object.fromEntries(options.body);
    calls.at(-1).values = values;
    if (pauseToken) { const pending = pauseToken; pauseToken = null; await pending; }
    if (values.grant_type === "refresh_token") refreshes++;
    return json({ access_token: `test-access-${refreshes}`, refresh_token: `test-refresh-${refreshes}`, expires_in: 3600, scope: "calendar-test" });
  }
  if (address.hostname === "openidconnect.googleapis.com") return json({ sub: googleSubject, email: "own-calendar@example.test" });
  if (address.hostname === "graph.microsoft.com" && address.pathname === "/v1.0/me") return json({ id: "outlook-account", displayName: "Outlook owner" });
  if (address.hostname === "api.calendly.com" && address.pathname === "/users/me") return json({ resource: { uri: "https://api.calendly.com/users/calendly-account", name: "Calendly owner" } });
  if (address.hostname === "api.calendly.com" && address.pathname.startsWith("/event_types")) {
    const resource = { uri: eventTypeUri, active: true, kind: "solo", name: "30 minute meeting", duration: 30, profile: { owner: "https://api.calendly.com/users/calendly-account" }, scheduling_url: "https://calendly.com/local-check/meeting" };
    if (address.pathname === "/event_types" && method === "POST") {
      const created = { ...resource, ...body, uri: `https://api.calendly.com/event_types/type-${randomUUID()}`, description_plain: body.description, profile: { owner: body.owner } };
      managedTypes.set(created.uri, created);
      if (failTypeCreate) { failTypeCreate = false; throw Error("Lost type create response"); }
      return json({ resource: created }, 201);
    }
    const uri = `https://api.calendly.com${address.pathname}`;
    if (managedTypes.has(uri)) {
      const managed = managedTypes.get(uri);
      if (method === "PATCH") Object.assign(managed, body, { description_plain: body.description });
      return json({ resource: managed });
    }
    if (address.pathname.endsWith("/foreign")) return json({ resource: { ...resource, uri, profile: { owner: "https://api.calendly.com/users/other" } } });
    if (address.pathname === "/event_types" && !address.searchParams.has("active")) return json({ collection: [resource, ...managedTypes.values()] });
    return json(address.pathname === "/event_types" ? { collection: [resource, { ...resource, uri: "https://api.calendly.com/event_types/foreign", profile: { owner: "https://api.calendly.com/users/other" } }] } : { resource });
  }
  if (address.hostname === "api.calendly.com" && address.pathname === "/event_type_availability_schedules") {
    const uri = address.searchParams.get("event_type");
    if (method === "PATCH") { schedules.set(uri, body.availability_rule); return json({ resource: { event_type: uri, availability_rule: body.availability_rule } }); }
    return json({ collection: [{ event_type: uri, availability_rule: schedules.get(uri) }] });
  }
  const provider = address.hostname === "www.googleapis.com" ? "GOOGLE" : address.hostname === "graph.microsoft.com" ? "OUTLOOK" : address.hostname === "api.calendly.com" ? "CALENDLY" : null;
  assert.ok(provider, `Unexpected network destination: ${address.hostname}`);
  const creating = method === "POST" && (address.pathname.endsWith("/events") || address.pathname === "/invitees");
  if (creating) {
    const failure = failCreate; failCreate = null;
    if (failure === "reject") return json({}, 429);
    const id = provider === "GOOGLE" ? body.id : provider === "OUTLOOK" ? `event-${body.transactionId}` : `cal-${body.tracking.utm_content}`;
    const event = provider === "CALENDLY" ? { id, name: "Booked meeting", status: "active", start_time: body.start_time, end_time: new Date(Date.parse(body.start_time) + 1800000).toISOString() } : { id, ...body, htmlLink: "https://calendar.google.com/calendar/event?eid=test", webLink: "https://outlook.office.com/calendar/item/test" };
    const existed = remoteEvents.has(id); remoteEvents.set(id, event);
    if (failure === "lost") throw new Error("Simulated lost response after provider commit");
    if (provider === "GOOGLE" && existed) return json({}, 409);
    if (provider === "CALENDLY") {
      const invitee = { uri: `https://api.calendly.com/scheduled_events/${id}/invitees/invitee`, event: `https://api.calendly.com/scheduled_events/${id}`, email: body.invitee.email, cancel_url: "https://calendly.com/cancellations/local", reschedule_url: "https://calendly.com/reschedulings/local" };
      remoteInvitees.set(new URL(invitee.uri).pathname, invitee);
      return json({ resource: invitee }, 201);
    }
    return json(event, 201);
  }
  if (provider === "CALENDLY" && address.pathname.includes("/invitees/")) return remoteInvitees.has(address.pathname) ? json({ resource: remoteInvitees.get(address.pathname) }) : json({}, 404);
  let id = address.pathname.split("/").at(-1);
  if (id === "cancellation") id = address.pathname.split("/").at(-2);
  const event = remoteEvents.get(id);
  if (!event) return json({}, 404);
  if (method === "PATCH") { Object.assign(event, body); return json(event); }
  if (method === "DELETE") { remoteEvents.delete(id); return new Response(null, { status: 204 }); }
  if (method === "POST" && address.pathname.endsWith("/cancellation")) {
    if (event.status === "canceled") return json({}, 400);
    event.status = "canceled"; return json({ resource: event });
  }
  return json(provider === "CALENDLY" ? { resource: event } : event);
};
function passed(name) { checks++; console.log(`PASS ${name}`); }
async function connect(provider, who = user) {
  const url = new URL(await beginCalendarConnection(who, provider));
  await completeCalendarConnection(who, provider, url.searchParams.get("state"), "test-code", marker);
  return url;
}
const booking = (provider, extra = {}) => ({ title: "Client follow-up", description: "Discuss requirements", startTime: "2026-11-01T10:00:00Z", endTime: "2026-11-01T10:30:00Z", provider, contactId: ids.contact, ...extra });
async function token(userId) { const value = randomUUID(); await prisma.authSession.create({ data: { userId, tokenHash: createHash("sha256").update(value).digest("hex"), expiresAt: new Date(Date.now() + 600000) } }); return value; }
function request(url, session, body, client = ids.client) { return new NextRequest(`http://localhost:3005${url}`, { method: body === undefined ? "GET" : "POST", headers: { ...(session ? { cookie: `multi_crm_session=${session}; multi_crm_active_client=${client}` } : {}), "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
async function main() {
  try {
    await prisma.organization.create({ data: { id: ids.org, name: marker, users: { create: [{ id: ids.agent, name: user.name, email: user.email, role: "AGENT", status: "ACTIVE" }, { id: ids.other, name: "Other", email: `${marker}-other@example.test`, role: "AGENT", status: "ACTIVE" }, { id: ids.admin, name: "Admin", email: `${marker}-admin@example.test`, role: "ADMIN", status: "ACTIVE" }] }, clients: { create: [{ id: ids.client, name: "Scheduling client", brandName: "Scheduling" }, { id: ids.denied, name: "Denied", brandName: "Denied" }] } } });
    await prisma.organization.create({ data: { id: ids.foreign, name: "Foreign" } });
    await prisma.clientAssignment.createMany({ data: [{ userId: ids.agent, clientAccountId: ids.client }, { userId: ids.other, clientAccountId: ids.client }] });
    await prisma.contact.create({ data: { id: ids.contact, organizationId: ids.org, clientAccountId: ids.client, firstName: "Prospect", lastName: "Example", email: "prospect@example.test" } });
    const manual = await createAppointment(context, booking("MANUAL"), marker);
    const mock = await createAppointment(context, booking("MOCK"), marker);
    assert.equal(manual.calendarSyncStatus, "LOCAL_ONLY"); assert.match(mock.externalId, /^mock-calendar-/); assert.equal(calls.length, 0);
    await assert.rejects(createAppointment(context, booking("GOOGLE"), marker), error => error.status === 422);
    passed("Manual and mock meetings remain available without credentials or provider requests");

    const authUrl = await connect("GOOGLE"); await connect("OUTLOOK"); await connect("CALENDLY");
    assert.ok(authUrl.searchParams.get("code_challenge")); assert.equal(authUrl.searchParams.get("code_challenge_method"), "S256");
    const authState = await prisma.calendarOAuthState.findUniqueOrThrow({ where: { stateHash: createHash("sha256").update(authUrl.searchParams.get("state")).digest("hex") } });
    const exchange = calls.find(call => call.values?.grant_type === "authorization_code");
    assert.equal(exchange.values.code_verifier, decryptIntegrationSecret(authState.encryptedVerifier));
    const connection = await prisma.calendarConnection.findUniqueOrThrow({ where: { userId_provider: { userId: ids.agent, provider: "GOOGLE" } } });
    assert.ok(!connection.encryptedAccessToken.includes("test-access"));
    const summaries = await listCalendarConnections(user);
    assert.equal(summaries.filter(item => item.connected).length, 3); assert.ok(!JSON.stringify(summaries).includes("test-access"));
    assert.equal((await listCalendarConnections(otherContext.user)).filter(item => item.connected).length, 0);
    await assert.rejects(completeCalendarConnection(user, "GOOGLE", authUrl.searchParams.get("state"), "again", marker), error => error.code === "INVALID_OAUTH_STATE");
    const pending = new URL(await beginCalendarConnection(user, "GOOGLE"));
    await assert.rejects(completeCalendarConnection(otherContext.user, "GOOGLE", pending.searchParams.get("state"), "wrong", marker));
    await prisma.calendarOAuthState.update({ where: { stateHash: createHash("sha256").update(pending.searchParams.get("state")).digest("hex") }, data: { expiresAt: new Date(0) } });
    await assert.rejects(completeCalendarConnection(user, "GOOGLE", pending.searchParams.get("state"), "expired", marker));
    passed("OAuth uses encrypted tokens, PKCE and expiring single-use state bound to the agent and provider");

    const template = { name: "Client discovery", duration: 45, description: "Discuss needs", active: false };
    const managed = await saveEventType(context, { ...template, owner: "https://api.calendly.com/users/other" }, marker);
    assert.equal(managed.active, false); assert.equal(managed.duration, 45);
    assert.equal(managedTypes.get(managed.uri).profile.owner, "https://api.calendly.com/users/calendly-account");
    const changedType = await saveEventType(context, { ...template, uri: managed.uri, name: "Updated discovery", duration: 60, active: true }, marker);
    assert.equal(changedType.name, "Updated discovery"); assert.equal(changedType.duration, 60);
    assert.ok((await listManagedEventTypes(context)).some(item => item.uri === managed.uri));
    const beforeForeignType = calls.length;
    await assert.rejects(saveEventType(context, { ...template, uri: "https://api.calendly.com/event_types/foreign" }, marker), error => error.status === 403);
    assert.equal(calls.length, beforeForeignType + 1); assert.equal(calls.at(-1).method, "GET");
    await assert.rejects(saveEventType(otherContext, template, marker), error => error.status === 422);
    await assert.rejects(saveEventType(context, { ...template, duration: 0 }, marker), error => error.status === 422);
    failTypeCreate = true;
    await assert.rejects(saveEventType(context, { ...template, name: "Check before retrying" }, marker), error => /may have created/.test(error.safeMessage));
    assert.ok((await listManagedEventTypes(context)).some(item => item.name === "Check before retrying"));
    passed("Event-type create/edit uses the agent's own account, includes inactive types, rejects foreign writes and exposes uncertain creates");

    const hours = { timezone: "Asia/Karachi", rules: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(wday => ({ type: "wday", wday, intervals: wday === "monday" ? [{ from: "09:00", to: "12:00" }, { from: "13:00", to: "17:00" }] : [] })) };
    hours.rules.push({ type: "date", date: "2026-12-25", intervals: [] });
    schedules.set(managed.uri, hours);
    const loadedHours = await getEventTypeAvailability(context, managed.uri);
    assert.deepEqual(loadedHours, hours);
    loadedHours.rules[0].intervals[0].from = "10:00";
    await saveEventTypeAvailability(context, managed.uri, loadedHours, marker);
    assert.deepEqual(schedules.get(managed.uri).rules.at(-1), { type: "date", date: "2026-12-25", intervals: [] });
    const beforeInvalidHours = calls.length;
    assert.throws(() => validateAvailability({ ...hours, timezone: "Invalid/Zone" }), error => error.status === 422);
    await assert.rejects(saveEventTypeAvailability(context, managed.uri, { ...hours, rules: hours.rules.map((rule, i) => i ? rule : { ...rule, intervals: [{ from: "17:00", to: "09:00" }] }) }, marker), error => error.status === 422);
    assert.equal(calls.length, beforeInvalidHours);
    await assert.rejects(getEventTypeAvailability(context, "https://attacker.test/event_types/foreign"));
    assert.ok(!calls.some(call => call.url.includes("attacker.test")));
    passed("Availability changes preserve split shifts and date overrides and reject invalid times, zones and external references");

    let google = await createAppointment(context, booking("GOOGLE"), marker);
    assert.equal(google.calendarSyncStatus, "SYNCED"); assert.ok(google.externalId);
    let sent = calls.find(call => call.method === "POST" && call.url.includes("/calendar/v3/calendars/primary/events"));
    assert.deepEqual(sent.body.attendees, []); assert.equal(new URL(sent.url).searchParams.get("sendUpdates"), "none");
    const invited = await createAppointment(context, booking("GOOGLE", { sendInvite: true }), marker);
    sent = calls.find(call => call.body?.id === invited.externalId);
    assert.equal(sent.body.attendees[0].email, "prospect@example.test"); assert.equal(new URL(sent.url).searchParams.get("sendUpdates"), "all");
    google = await updateAppointment(context, google.id, { title: "Changed", startTime: "2026-11-01T11:00:00Z", endTime: "2026-11-01T11:30:00Z" }, marker);
    assert.equal(remoteEvents.get(google.externalId).summary, "Changed");
    remoteEvents.get(google.externalId).summary = "Changed in Google";
    assert.equal((await syncCalendarAppointment(context, google.id, marker, "PULL")).title, "Changed in Google");
    await assert.rejects(updateAppointment(otherContext, google.id, { title: "Forbidden" }, marker), error => error.status === 403);
    await assert.rejects(syncCalendarAppointment(otherContext, google.id, marker), error => error.status === 404);
    passed("Google creates, edits and refreshes meetings; invitations are explicit and other agents cannot change them");

    let outlook = await createAppointment(context, booking("OUTLOOK", { sendInvite: true }), marker);
    sent = calls.find(call => call.body?.transactionId === outlook.id);
    assert.equal(sent.body.start.timeZone, "UTC"); assert.equal(sent.body.attendees[0].emailAddress.address, "prospect@example.test");
    outlook = await updateAppointment(context, outlook.id, { description: "Updated notes" }, marker);
    assert.equal(remoteEvents.get(outlook.externalId).body.content, "Updated notes");
    assert.equal((await syncCalendarAppointment(context, outlook.id, marker, "PULL")).startTime.toISOString(), "2026-11-01T10:00:00.000Z");
    await updateAppointment(context, outlook.id, { status: "CANCELLED" }, marker);
    assert.equal(remoteEvents.has(outlook.externalId), false);
    await assert.rejects(updateAppointment(context, outlook.id, { status: "SCHEDULED" }, marker), error => error.status === 422);
    passed("Outlook uses UTC, explicit invitees and stable IDs; cancellation cannot silently reopen a deleted booking");

    failCreate = "lost";
    let retry = await createAppointment(context, booking("GOOGLE"), marker);
    assert.equal(retry.calendarSyncStatus, "FAILED");
    const countBefore = remoteEvents.size;
    await Promise.all(Array.from({ length: 8 }, () => syncCalendarAppointment(context, retry.id, marker)));
    retry = await prisma.appointment.findUniqueOrThrow({ where: { id: retry.id } });
    assert.equal(retry.calendarSyncStatus, "SYNCED"); assert.equal(remoteEvents.size, countBefore);
    failCreate = "lost";
    const lostOutlook = await createAppointment(context, booking("OUTLOOK"), marker);
    const size = remoteEvents.size;
    assert.equal((await syncCalendarAppointment(context, lostOutlook.id, marker)).calendarSyncStatus, "SYNCED");
    assert.equal(remoteEvents.size, size);
    passed("Lost create responses and concurrent retries recover without duplicate Google or Outlook events");

    await prisma.calendarConnection.update({ where: { id: connection.id }, data: { accessTokenExpiresAt: new Date(0) } });
    failCreate = "reject";
    const limited = await createAppointment(context, booking("GOOGLE"), marker);
    assert.equal(limited.calendarSyncStatus, "FAILED"); assert.match(limited.lastSyncError, /rate limit/);
    assert.equal(refreshes, 1);
    const fresh = await prisma.calendarConnection.findUniqueOrThrow({ where: { id: connection.id } });
    assert.ok(fresh.accessTokenExpiresAt > new Date()); assert.equal(decryptIntegrationSecret(fresh.encryptedRefreshToken), "test-refresh-1");
    await syncCalendarAppointment(context, limited.id, marker); assert.equal(refreshes, 1);
    passed("Provider failures retain local meetings and commit rotated refresh tokens for successful retry");

    const types = await listCalendlyEventTypes(context); assert.equal(types.eventTypes.length, 1);
    let calendly = await createAppointment(context, booking("CALENDLY", { sendInvite: true, calendlyEventTypeUri: eventTypeUri, timeZone: "Asia/Karachi" }), marker);
    assert.equal(calendly.calendarSyncStatus, "SYNCED");
    sent = calls.find(call => call.body?.tracking?.utm_content === calendly.id);
    assert.equal(sent.body.invitee.timezone, "Asia/Karachi"); assert.equal(sent.body.invitee.email, "prospect@example.test");
    await assert.rejects(updateAppointment(context, calendly.id, { startTime: "2026-11-01T12:00:00Z", endTime: "2026-11-01T12:30:00Z" }, marker), error => error.status === 422);
    assert.equal((await syncCalendarAppointment(context, calendly.id, marker, "PULL")).calendarSyncStatus, "SYNCED");
    const oldInvitee = remoteInvitees.get(new URL(calendly.externalMetadata.inviteeUri).pathname);
    const replacementId = `rescheduled-${calendly.id}`;
    const replacementUri = `https://api.calendly.com/scheduled_events/${replacementId}`;
    remoteEvents.get(calendly.externalId.split("/").at(-1)).status = "canceled";
    remoteEvents.set(replacementId, { id: replacementId, name: "Rescheduled meeting", status: "active", start_time: "2026-11-02T10:00:00Z", end_time: "2026-11-02T10:30:00Z" });
    oldInvitee.rescheduled = true; oldInvitee.new_invitee = `${replacementUri}/invitees/replacement`;
    remoteInvitees.set(new URL(oldInvitee.new_invitee).pathname, { ...oldInvitee, uri: oldInvitee.new_invitee, event: replacementUri, rescheduled: false, new_invitee: null, reschedule_url: "https://calendly.com/reschedulings/replacement" });
    calendly = await syncCalendarAppointment(context, calendly.id, marker, "PULL");
    assert.equal(calendly.externalId, replacementUri); assert.equal(calendly.startTime.toISOString(), "2026-11-02T10:00:00.000Z"); assert.equal(calendly.status, "SCHEDULED"); assert.equal(calendly.externalMetadata.rescheduleUrl, "https://calendly.com/reschedulings/replacement");
    const otherWorkspace = await listCalendarWorkspace(otherContext);
    assert.equal(otherWorkspace.appointments.find(item => item.id === calendly.id).externalMetadata, null);
    assert.equal((await listCalendarWorkspace(context)).appointments.find(item => item.id === calendly.id).externalMetadata.rescheduleUrl, "https://calendly.com/reschedulings/replacement");
    passed("Calendly refresh follows the selected contact's reschedule to the new booking and updates its links");
    await updateAppointment(context, calendly.id, { status: "CANCELLED" }, marker);
    await prisma.appointment.update({ where: { id: calendly.id }, data: { calendarSyncStatus: "FAILED" } });
    assert.equal((await syncCalendarAppointment(context, calendly.id, marker)).calendarSyncStatus, "SYNCED");
    const invalid = await createAppointment(context, booking("CALENDLY", { sendInvite: true, calendlyEventTypeUri: "https://attacker.test/event_types/unsafe" }), marker);
    assert.equal(invalid.calendarSyncStatus, "FAILED"); assert.ok(calls.every(call => !call.url.includes("attacker.test")));
    assert.equal(safeCalendarUrl("https://attacker.test/schedule", "CALENDLY"), null);
    passed("Calendly validates owned event types, books invitees, refreshes and cancels; external URLs cannot redirect credentials");

    failCreate = "lost";
    const uncertain = await createAppointment(context, booking("CALENDLY", { sendInvite: true, calendlyEventTypeUri: eventTypeUri }), marker);
    assert.equal(uncertain.calendarSyncStatus, "REVIEW_REQUIRED");
    const creations = calls.filter(call => call.url.endsWith("/invitees") && call.method === "POST").length;
    await assert.rejects(syncCalendarAppointment(context, uncertain.id, marker), error => error.status === 409);
    await updateAppointment(context, uncertain.id, { title: "Local correction" }, marker);
    assert.equal(calls.filter(call => call.url.endsWith("/invitees") && call.method === "POST").length, creations);
    passed("Ambiguous Calendly bookings require review and cannot be duplicated through retries or edits");

    googleSubject = "different-google-account"; await connect("GOOGLE");
    await prisma.appointment.update({ where: { id: retry.id }, data: { calendarSyncStatus: "FAILED" } });
    const beforeForeign = calls.length;
    const wrongAccount = await syncCalendarAppointment(context, retry.id, marker);
    assert.equal(wrongAccount.calendarSyncStatus, "FAILED"); assert.match(wrongAccount.lastSyncError, /original calendar/); assert.equal(calls.length, beforeForeign);
    googleSubject = "google-account"; await connect("GOOGLE");
    const waitingUrl = new URL(await beginCalendarConnection(user, "GOOGLE"));
    let resumeToken; pauseToken = new Promise(resolve => { resumeToken = resolve; });
    const completing = completeCalendarConnection(user, "GOOGLE", waitingUrl.searchParams.get("state"), "delayed", marker);
    while (!calls.at(-1).values || calls.at(-1).values.code !== "delayed") await new Promise(resolve => setImmediate(resolve));
    await disconnectCalendar(user, "GOOGLE", marker); resumeToken();
    await assert.rejects(completing, error => error.code === "INVALID_OAUTH_STATE");
    const disconnected = await prisma.calendarConnection.findUniqueOrThrow({ where: { id: connection.id } });
    assert.equal(disconnected.status, "DISCONNECTED"); assert.equal(disconnected.encryptedAccessToken, null);
    passed("Account changes cannot redirect an old booking; disconnect erases local credentials and cancels in-flight OAuth");

    const session = await token(ids.agent), otherSession = await token(ids.other), adminSession = await token(ids.admin);
    assert.equal((await routes.connections.GET(request("/api/calendar/connections", undefined))).status, 401);
    assert.equal((await routes.connections.GET(request("/api/calendar/connections", adminSession))).status, 403);
    const summariesResponse = await routes.connections.GET(request("/api/calendar/connections", session));
    assert.equal(summariesResponse.status, 200); assert.ok(!JSON.stringify(await summariesResponse.json()).includes("encrypted"));
    assert.equal((await routes["events/[id]/sync"].POST(request("/api/calendar/events/sync", otherSession, { mode: "PUSH" }), { params: Promise.resolve({ id: limited.id }) })).status, 404);
    assert.equal((await routes["schedule"].POST(request("/api/calendar/schedule", session, booking("MANUAL"), ids.denied))).status, 403);
    assert.equal((await routes["events/[id]/sync"].POST(request("/api/calendar/events/sync", session, { mode: "INVALID" }), { params: Promise.resolve({ id: limited.id }) })).status, 422);
    const forged = await routes["connections/[provider]/callback"].GET(request("/api/calendar/connections/GOOGLE/callback?state=forged&code=bad", session), { params: Promise.resolve({ provider: "GOOGLE" }) });
    assert.equal(forged.status, 303); assert.match(forged.headers.get("location"), /^http:\/\/localhost:3005\/calendar\?calendarError=connection_failed$/);
    await assert.rejects(listCalendarWorkspace({ user: { ...user, organizationId: ids.foreign }, activeClientAccountId: ids.client }), error => error.status === 403);
    await assert.rejects(createAppointment(context, booking("MANUAL", { timeZone: "Invalid/Timezone" }), marker), error => error.status === 422);
    assert.ok(await prisma.auditLog.count({ where: { organizationId: ids.org, action: "APPOINTMENT_SYNC_FAILED" } }));
    passed("HTTP routes maintain session, agency, client and booking-owner boundaries and return safe errors");
    console.log(`${checks} calendar provider integration checks passed.`);
  } finally { await prisma.organization.deleteMany({ where: { id: { in: [ids.org, ids.foreign] } } }); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
