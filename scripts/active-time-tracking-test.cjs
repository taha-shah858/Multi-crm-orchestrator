// Real local database + browser policy checks. Disposable fixtures; no provider calls.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const { createHash, randomUUID } = require("node:crypto");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env.local"), quiet: true });
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
process.env.NODE_ENV = "test";
console.info = () => {};
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function(request, parent, isMain, options) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, parent, isMain, options);
};
Module._load = function(request, parent, isMain) { return request === "server-only" ? {} : load.call(this, request, parent, isMain); };
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { NextRequest } = require("next/server");
const { prisma } = require("../src/lib/db/prisma.ts");
const { trackActiveTime } = require("../src/lib/operations/time-tracking-service.ts");
const { listSalesOperations, listTimeOperations, createManualTimeLog, updateTimeLog } = require("../src/lib/operations/sales-operations-service.ts");
const { getAdminDashboard } = require("../src/lib/admin/admin-service.ts");
const { ActiveTimeController } = require("../src/lib/operations/active-time-controller.ts");
const trackingApi = require("../src/app/api/time-tracking/route.ts");
const timeApi = require("../src/app/api/time-logs/route.ts");
const editApi = require("../src/app/api/time-logs/[id]/route.ts");
const auditApi = require("../src/app/api/time-audit/route.ts");
const { getTimeAudit, saveHourlyRate, timeAuditCsv } = require("../src/lib/operations/time-audit-service.ts");
const marker = `active-time-${Date.now()}`;
const ids = { org: marker, foreign: `${marker}-foreign`, agent: `${marker}-agent`, other: `${marker}-other`, admin: `${marker}-admin`, client: `${marker}-client`, second: `${marker}-second`, denied: `${marker}-denied` };
const user = { id: ids.agent, organizationId: ids.org, name: "Time Agent", email: `${marker}@example.test`, role: "AGENT" };
const admin = { ...user, id: ids.admin, role: "ADMIN" };
const context = { user, activeClientAccountId: ids.client };
const base = Date.parse("2026-01-15T12:00:00Z");
let checks = 0;
function passed(name) { checks++; console.log(`PASS ${name}`); }
const input = (sequence, tabId, action = "HEARTBEAT", clientAccountId = ids.client, extra = {}) => ({ sequence, tabId, action, clientAccountId, ...extra });
const track = (sequence, tab, seconds, action = "HEARTBEAT", client = ids.client, extra = {}) => trackActiveTime(user, input(sequence, tab, action, client, extra), marker, new Date(base + seconds * 1000));
async function reset() {
  await prisma.timeTrackingSession.deleteMany({ where: { organizationId: ids.org } });
  await prisma.timeLog.deleteMany({ where: { organizationId: ids.org } });
}
async function seconds(client = ids.client) {
  return (await prisma.timeLog.aggregate({ where: { organizationId: ids.org, clientAccountId: client }, _sum: { trackedSeconds: true } }))._sum.trackedSeconds ?? 0;
}
async function session(userId) {
  const token = randomUUID();
  await prisma.authSession.create({ data: { userId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
  return token;
}
function request(url, token, body, client = ids.client) {
  return new NextRequest(`http://localhost${url}`, { method: body === undefined ? "GET" : "POST", headers: { ...(token ? { cookie: `multi_crm_session=${token}; multi_crm_active_client=${client}` } : {}), "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function databaseChecks() {
  await prisma.organization.create({ data: { id: ids.org, name: marker, users: { create: [
    { id: ids.agent, name: user.name, email: user.email, role: "AGENT", status: "ACTIVE" },
    { id: ids.other, name: "Other Agent", email: `${marker}-other@example.test`, role: "AGENT", status: "ACTIVE" },
    { id: ids.admin, name: "Admin", email: `${marker}-admin@example.test`, role: "ADMIN", status: "ACTIVE" },
  ] }, clients: { create: [{ id: ids.client, name: "Time client", brandName: "Time" }, { id: ids.second, name: "Second", brandName: "Second" }, { id: ids.denied, name: "Denied", brandName: "Denied" }] } } });
  await prisma.organization.create({ data: { id: ids.foreign, name: "Foreign" } });
  await prisma.clientAssignment.createMany({ data: [{ userId: ids.agent, clientAccountId: ids.client }, { userId: ids.agent, clientAccountId: ids.second }, { userId: ids.other, clientAccountId: ids.client }] });
  let tab = randomUUID();
  await track(1, tab, 0);
  assert.equal(await prisma.timeLog.count({ where: { organizationId: ids.org } }), 0);
  let result = await track(2, tab, 20);
  assert.equal(result.trackedSeconds, 20);
  let log = await prisma.timeLog.findUniqueOrThrow({ where: { id: result.timeLogId } });
  assert.equal(log.minutes, 0); assert.equal(log.source, "AUTO");
  result = await track(3, tab, 60);
  assert.equal(result.trackedSeconds, 60);
  result = await track(4, tab, 67, "PAUSE", ids.client, { reason: "MANUAL" });
  assert.equal(result.trackedSeconds, 67); assert.equal(result.isRunning, false);
  await track(5, tab, 600); await track(6, tab, 620);
  assert.equal(await seconds(), 87);
  assert.equal(await prisma.timeLog.count({ where: { organizationId: ids.org } }), 2);
  passed("Exact seconds persist, brief starts create no empty rows, pauses exclude away time");

  await reset(); tab = randomUUID();
  await track(1, tab, 0);
  assert.equal((await track(2, tab, 19, "PAUSE", ids.client, { reason: "SWITCH" })).clientTotalSeconds, 19);
  const secondTab = randomUUID(); await track(1, secondTab, 19, "HEARTBEAT", ids.second);
  await track(2, secondTab, 39, "HEARTBEAT", ids.second);
  await track(3, secondTab, 59, "PAUSE", ids.second, { reason: "SWITCH" });
  const returningTab = randomUUID();
  assert.equal((await track(1, returningTab, 59)).clientTotalSeconds, 19);
  assert.equal((await track(2, returningTab, 79)).clientTotalSeconds, 39);
  assert.equal(await seconds(ids.second), 40);
  assert.equal((await track(3, returningTab, 79, "PAUSE")).clientTotalSeconds, 39);
  assert.equal((await track(1, randomUUID(), 600)).clientTotalSeconds, 39);
  passed("Each client's cumulative timer resumes from 19 seconds after switching and survives reloads without charging away time");

  await reset(); tab = randomUUID(); await track(1, tab, 0);
  const stopped = await track(2, tab, 19, "PAUSE", ids.client, { reason: "STOP" });
  assert.equal(stopped.clientTotalSeconds, 19); assert.equal(stopped.isRunning, false);
  const restarted = await track(3, tab, 19);
  assert.equal(restarted.trackedSeconds, 0); assert.equal(restarted.clientTotalSeconds, 19);
  const nextSession = await track(4, tab, 29);
  assert.equal(nextSession.trackedSeconds, 10); assert.equal(nextSession.clientTotalSeconds, 29);
  assert.notEqual(nextSession.timeLogId, stopped.timeLogId);
  assert.equal(await prisma.timeLog.count({ where: { organizationId: ids.org } }), 2);
  passed("Stop saves the exact partial session, starts a new session from zero, and preserves the client total");

  await reset(); tab = randomUUID();
  await Promise.all(Array.from({ length: 12 }, () => track(1, tab, 0)));
  await Promise.all(Array.from({ length: 12 }, () => track(2, tab, 20)));
  assert.equal(await seconds(), 20);
  const replay = await track(1, tab, 40);
  assert.equal(replay.ignored, true); assert.equal(await seconds(), 20);
  const tabs = Array.from({ length: 12 }, () => randomUUID());
  await Promise.all(tabs.map(id => track(1, id, 30)));
  await Promise.all(tabs.map(id => track(2, id, 40)));
  assert.ok(await seconds() <= 30);
  assert.equal(await prisma.timeTrackingSession.count({ where: { userId: ids.agent } }), 1);
  passed("Concurrent starts, duplicate requests and competing tabs never double-count an agent");

  await reset(); tab = randomUUID();
  await track(1, tab, 0); await track(2, tab, 40);
  assert.equal((await track(3, tab, 30)).ignored, true);
  await track(4, tab, 50);
  assert.equal((await track(1, randomUUID(), 45)).ignored, true);
  await track(5, tab, 60);
  assert.equal(await seconds(), 60);
  await track(6, tab, 80, "PAUSE", ids.client, { reset: true });
  assert.equal(await seconds(), 60);
  passed("Delayed server timestamps never replay an interval, and recovery pauses exclude uncertain gaps");

  await reset(); tab = randomUUID();
  await track(1, tab, 0); await track(2, tab, 20);
  await track(3, tab, 25, "HEARTBEAT", ids.second);
  await track(4, tab, 45, "HEARTBEAT", ids.second);
  assert.equal(await seconds(), 25); assert.equal(await seconds(ids.second), 20);
  const newer = randomUUID(); await track(1, newer, 50, "HEARTBEAT", ids.second);
  const oldPause = await track(5, tab, 55, "PAUSE", ids.second, { reason: "HIDDEN" });
  assert.equal(oldPause.ignored, true); assert.equal(oldPause.isRunning, true);
  await track(2, newer, 70, "HEARTBEAT", ids.second);
  assert.equal(await seconds(ids.second), 40);
  passed("Switches attribute each interval to its client; an old tab cannot pause the current owner");

  await reset(); tab = randomUUID();
  await track(1, tab, 0); await track(2, tab, 20);
  await track(3, tab, 100); await track(4, tab, 120);
  await track(5, tab, 140, "HEARTBEAT", ids.client, { reset: true });
  await track(6, tab, 160);
  assert.equal(await seconds(), 60);
  tab = randomUUID(); await track(1, tab, 170); await track(2, tab, 190);
  assert.equal(await seconds(), 80);
  passed("Stale gaps, network recovery and reloads start fresh without crediting unconfirmed time");

  await reset(); tab = randomUUID();
  await trackActiveTime(user, input(1, tab), marker, new Date("2026-01-31T23:59:50Z"));
  result = await trackActiveTime(user, input(2, tab), marker, new Date("2026-02-01T00:00:10Z"));
  assert.equal(result.trackedSeconds, 10);
  const january = await listTimeOperations(context, { from: "2026-01-31", to: "2026-01-31" });
  const february = await listTimeOperations(context, { from: "2026-02-01", to: "2026-02-01" });
  assert.equal(january.summary.activeSeconds, 10); assert.equal(february.summary.activeSeconds, 10);
  assert.equal((await listSalesOperations(context)).summary.activeSeconds, 20);
  passed("UTC midnight splits exact seconds into the correct report dates");

  const oldLogId = result.timeLogId;
  const corrected = await updateTimeLog(context, oldLogId, { minutes: 3, description: "Corrected work" }, marker);
  assert.equal(corrected.trackedSeconds, 10); assert.equal(corrected.isManualOverride, true);
  await trackActiveTime(user, input(3, tab), marker, new Date("2026-02-01T00:00:20Z"));
  result = await trackActiveTime(user, input(4, tab), marker, new Date("2026-02-01T00:00:40Z"));
  assert.notEqual(result.timeLogId, oldLogId);
  assert.equal((await prisma.timeLog.findUniqueOrThrow({ where: { id: oldLogId } })).minutes, 3);
  assert.equal((await listTimeOperations(context)).summary.activeSeconds, 210);
  await updateTimeLog(context, oldLogId, { minutes: 0 }, marker);
  assert.equal((await listTimeOperations(context)).summary.activeSeconds, 30);
  assert.ok(await prisma.auditLog.count({ where: { entityId: oldLogId, action: "TIME_LOG_UPDATED" } }));
  passed("Corrections retain raw measurements, allow zeroing an automatic entry, and survive future heartbeats");

  await reset(); tab = randomUUID();
  await track(1, tab, 0); result = await track(2, tab, 20);
  await Promise.all([
    updateTimeLog(context, result.timeLogId, { minutes: 7 }, marker),
    track(3, tab, 40),
  ]);
  log = await prisma.timeLog.findUniqueOrThrow({ where: { id: result.timeLogId } });
  assert.equal(log.minutes, 7); assert.equal(log.isManualOverride, true);
  await track(4, tab, 60);
  assert.equal((await prisma.timeLog.findUniqueOrThrow({ where: { id: log.id } })).minutes, 7);
  passed("Concurrent corrections and heartbeats commit without lost overrides or lock deadlocks");

  const manual = await createManualTimeLog(context, { minutes: 2, description: "Off-platform work" }, marker);
  assert.equal(manual.source, "MANUAL");
  await assert.rejects(createManualTimeLog(context, { minutes: 0, description: "Invalid" }, marker));
  await assert.rejects(updateTimeLog({ user: { ...user, id: ids.other }, activeClientAccountId: ids.client }, log.id, { minutes: 99 }, marker), error => error.status === 404);
  await assert.rejects(track(5, tab, 80, "HEARTBEAT", ids.denied), error => error.status === 403);
  await assert.rejects(trackActiveTime(admin, input(1, randomUUID()), marker), error => error.status === 403);
  await assert.rejects(trackActiveTime({ ...user, organizationId: ids.foreign }, input(1, randomUUID()), marker), error => error.status === 403);
  await prisma.clientAssignment.delete({ where: { clientAccountId_userId: { userId: ids.agent, clientAccountId: ids.client } } });
  const before = await seconds();
  await assert.rejects(track(5, tab, 80), error => error.status === 403);
  await track(5, tab, 80, "PAUSE", ids.client, { reason: "LEAVING" });
  assert.equal(await seconds(), before);
  await prisma.clientAssignment.create({ data: { userId: ids.agent, clientAccountId: ids.client } });
  passed("Manual fallback works; foreign clients, other agents and revoked assignments cannot mutate work time");

  await reset();
  await prisma.timeLog.createMany({ data: Array.from({ length: 125 }, () => ({ organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, source: "AUTO", minutes: 0, trackedSeconds: 30, description: "Short task", loggedAt: new Date(base) })) });
  await prisma.timeLog.createMany({ data: [
    { organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, source: "AUTO", minutes: 5, trackedSeconds: 20, isManualOverride: true, description: "Override", loggedAt: new Date(base) },
    { organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, source: "MANUAL", minutes: 1, description: "Manual", loggedAt: new Date(base) },
    { organizationId: ids.org, clientAccountId: ids.client, userId: ids.other, source: "AUTO", minutes: 1, trackedSeconds: 90, description: "Other agent", loggedAt: new Date(base) },
    { organizationId: ids.org, clientAccountId: ids.second, userId: ids.agent, source: "AUTO", minutes: 1, trackedSeconds: 60, description: "Other client", loggedAt: new Date(base) },
  ] });
  const report = await listTimeOperations(context, { from: "2026-01-15", to: "2026-01-15" });
  assert.equal(report.timeLogs.length, 100); assert.equal(report.summary.recordCount, 127);
  assert.equal(report.summary.activeSeconds, 4110); assert.equal(report.summary.activeMinutes, 68.5);
  assert.equal((await getAdminDashboard(admin)).summary.activeSeconds, 4260);
  assert.equal((await getAdminDashboard({ ...admin, organizationId: ids.foreign })).summary.activeSeconds, 0);
  passed("Complete totals include over 100 short sessions, manual overrides and correctly scoped admin views");

  const token = await session(ids.agent), adminToken = await session(ids.admin), otherToken = await session(ids.other);
  tab = randomUUID();
  const valid = input(1, tab);
  const apiResult = await trackingApi.POST(request("/api/time-tracking", token, { ...valid, trackedSeconds: 999999, now: "2020-01-01" }));
  assert.equal(apiResult.status, 200);
  assert.equal((await apiResult.json()).tracking.trackedSeconds, 0);
  const cursor = await prisma.timeTrackingSession.findUniqueOrThrow({ where: { userId: ids.agent } });
  assert.ok(Math.abs(cursor.lastHeartbeatAt.getTime() - Date.now()) < 10000);
  assert.equal((await trackingApi.POST(request("/api/time-tracking", undefined, valid))).status, 401);
  assert.equal((await trackingApi.POST(request("/api/time-tracking", adminToken, valid))).status, 403);
  assert.equal((await trackingApi.POST(request("/api/time-tracking", token, valid, ids.second))).status, 409);
  assert.equal((await trackingApi.POST(request("/api/time-tracking", token, { ...valid, clientAccountId: ids.denied }, ids.denied))).status, 403);
  for (const invalid of [null, [], { ...valid, sequence: 0 }, { ...valid, tabId: "invalid" }, { ...valid, reason: "WRONG" }, { ...valid, reset: "true" }]) {
    assert.equal((await trackingApi.POST(request("/api/time-tracking", token, invalid))).status, 422);
  }
  assert.equal((await trackingApi.POST(new NextRequest("http://localhost/api/time-tracking", { method: "POST", headers: { cookie: `multi_crm_session=${token}` }, body: "{" }))).status, 422);
  assert.equal((await editApi.PATCH(request("/api/time-logs", otherToken, { minutes: 99 }), { params: Promise.resolve({ id: report.timeLogs[0].id }) })).status, 404);
  const listResponse = await timeApi.GET(request("/api/time-logs?from=2026-01-15&to=2026-01-15", token));
  assert.equal(listResponse.status, 200); assert.equal((await listResponse.json()).summary.activeSeconds, 4110);
  assert.equal((await timeApi.GET(request("/api/time-logs?from=2026-02-31", token))).status, 422);
  passed("HTTP routes enforce sessions, selected client, valid input and server-owned time");

  let audit = await getTimeAudit(user, { from: "2026-01-15", to: "2026-01-15" });
  assert.equal(audit.totalSeconds, 4170); assert.equal(audit.totalExpectedPayCents, null);
  await saveHourlyRate(user, { hourlyRate: "30.00", currency: "USD" });
  audit = await getTimeAudit(user, { from: "2026-01-15", to: "2026-01-15" });
  assert.equal(audit.totalExpectedPayCents, 3475); assert.equal(audit.logs.length, 50); assert.equal(audit.logCount, 128);
  const csvReport = await getTimeAudit(user, { from: "2026-01-15", to: "2026-01-15" }, undefined, 1, true);
  assert.equal(csvReport.logs.length, 128); assert.equal(csvReport.logs.some(log => log.description === "Other agent"), false);
  assert.equal((await getTimeAudit(user, {}, ids.second)).totalSeconds, 60);
  assert.equal((await getTimeAudit(user, { from: "2026-01-16" })).totalSeconds, 0);
  await assert.rejects(getTimeAudit(user, {}, ids.denied), error => error.status === 403);
  await assert.rejects(getTimeAudit({ ...user, organizationId: ids.foreign }), error => Boolean(error));
  for (const invalid of [-1, "oops", "1.234", "", Infinity]) await assert.rejects(saveHourlyRate(user, { hourlyRate: invalid, currency: "USD" }), error => error.status === 422);
  assert.equal((await auditApi.GET(request("/api/time-audit", undefined))).status, 401);
  assert.equal((await auditApi.GET(request("/api/time-audit", adminToken))).status, 403);
  assert.equal((await auditApi.GET(request(`/api/time-audit?clientId=${ids.denied}`, token))).status, 403);
  const exported = await auditApi.GET(request("/api/time-audit?format=csv&from=2026-01-15&to=2026-01-15", token));
  assert.equal(exported.status, 200); assert.match(exported.headers.get("content-type"), /text\/csv/);
  assert.match(await exported.text(), /"TOTAL","69:30","4170"/);
  const readTotal = await trackingApi.GET(request("/api/time-tracking", token));
  assert.equal((await readTotal.json()).clientTotalSeconds, 4110);
  passed("All-client time audit and uncapped CSV include exact own-client totals, corrections and rate estimates with authorization and date filtering");

  await reset();
  await prisma.timeLog.create({ data: { organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, source: "AUTO", trackedSeconds: 600, minutes: 10, description: "=HYPERLINK(unsafe)", loggedAt: new Date(base) } });
  audit = await getTimeAudit(user);
  assert.equal(audit.totalExpectedPayCents, 500);
  assert.match(timeAuditCsv(audit), /'\=HYPERLINK/);
  await saveHourlyRate(user, { hourlyRate: "60", currency: "USD" });
  assert.equal((await getTimeAudit(user)).totalExpectedPayCents, 1000);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: ids.other } })).hourlyRateCents, null);
  passed("Ten minutes earns one-sixth of the hourly rate; rate changes recalculate estimates and CSV text cannot run formulas");
}

function browserFixture(initiallyPaused = false) {
  const fixture = { now: 0, availability: "ACTIVE", sent: [], states: [], saves: 0, fail: false };
  fixture.controller = new ActiveTimeController({ clientAccountId: "client", tabId: randomUUID(), initiallyPaused,
    now: () => fixture.now, available: () => fixture.availability,
    send: async input => { fixture.sent.push(input); if (fixture.fail) throw new Error("Unsaved"); return { clientAccountId: "client", trackedSeconds: 20, timeLogId: "log", isRunning: input.action === "HEARTBEAT", ignored: false }; },
    onChange: state => fixture.states.push(state), onSaved: () => fixture.saves++,
  });
  return fixture;
}
async function browserChecks() {
  let restoreNow = 0;
  const restored = new ActiveTimeController({ clientAccountId: "client", tabId: randomUUID(), now: () => restoreNow, available: () => "ACTIVE", onChange: () => {}, onSaved: () => {},
    send: async () => ({ clientAccountId: "client", trackedSeconds: 0, clientTotalSeconds: 19, timeLogId: null, isRunning: true, ignored: false }),
  });
  await restored.tick(); assert.equal(restored.getState().seconds, 19);
  restoreNow = 5000; assert.equal(restored.getState().seconds, 24);
  const paused = browserFixture(true); paused.controller.restoreTotal(19); await paused.controller.tick(); assert.equal(paused.controller.getState().seconds, 19);
  passed("Browser display uses cumulative client total plus current seconds, including restored manually paused timers");
  let stopNow = 0; let cumulative = 19;
  const stopInputs = [];
  const stoppingController = new ActiveTimeController({ clientAccountId: "client", tabId: randomUUID(), now: () => stopNow, available: () => "ACTIVE", onChange: () => {}, onSaved: () => {},
    send: async input => { stopInputs.push(input); if (input.action === "PAUSE") cumulative += 5; return { clientAccountId: "client", trackedSeconds: input.action === "PAUSE" ? 5 : 0, clientTotalSeconds: cumulative, isRunning: input.action === "HEARTBEAT", timeLogId: null, ignored: false }; },
  });
  await stoppingController.tick(); stopNow = 5000; await stoppingController.stopAndRestart();
  assert.deepEqual(stopInputs.map(input => input.action), ["HEARTBEAT", "PAUSE", "HEARTBEAT"]);
  assert.equal(stopInputs[1].reason, "STOP"); assert.equal(stoppingController.getState().seconds, 24);
  assert.equal(stoppingController.getState().sessionSeconds, 0);
  const failure = new ActiveTimeController({ clientAccountId: "client", tabId: randomUUID(), now: () => 0, available: () => "ACTIVE", onChange: () => {}, onSaved: () => {}, send: async () => { throw new Error("Could not save"); } });
  await failure.stopAndRestart(); assert.equal(failure.getState().status, "ERROR");
  passed("Stop queues saving before restarting; a failed save cannot report a successful restart");
  let f = browserFixture(); await f.controller.tick();
  assert.equal(f.controller.getState().status, "RUNNING");
  f.now = 20000; await f.controller.tick(); f.now = 120000; await f.controller.tick();
  assert.equal(f.controller.getState().status, "IDLE"); assert.equal(f.sent.at(-1).reason, "IDLE");
  const count = f.sent.length; f.now = 180000; await f.controller.tick(); assert.equal(f.sent.length, count);
  f.controller.activity(); await f.controller.tick(); assert.equal(f.sent.at(-1).action, "HEARTBEAT");
  passed("Browser policy pauses after two idle minutes and resumes on activity");

  f = browserFixture(); await f.controller.tick(); f.availability = "HIDDEN"; await f.controller.tick();
  assert.equal(f.sent.at(-1).reason, "HIDDEN"); assert.equal(f.controller.getState().status, "HIDDEN");
  f.availability = "ACTIVE"; f.controller.activity(); await f.controller.tick();
  await f.controller.setPaused(true); assert.equal(f.sent.at(-1).reason, "MANUAL");
  f.controller.activity(); await f.controller.tick(); assert.equal(f.controller.getState().status, "PAUSED");
  await f.controller.setPaused(false); assert.equal(f.controller.getState().status, "RUNNING");
  f = browserFixture(true); await f.controller.tick(); assert.equal(f.sent.length, 0); assert.equal(f.controller.getState().status, "PAUSED");
  passed("Hidden tabs stop; manual pause persists through activity and restored preferences");

  f = browserFixture(); await f.controller.tick(); f.availability = "OFFLINE"; f.fail = true; await f.controller.tick();
  assert.equal(f.controller.getState().status, "ERROR");
  f.availability = "ACTIVE"; f.fail = false; f.controller.activity(); await f.controller.tick();
  assert.equal(f.sent.at(-1).reset, true); assert.equal(f.controller.getState().status, "RUNNING");
  f.controller.dispose(); await f.controller.tick();
  assert.equal(f.sent.at(-1).action, "PAUSE"); assert.equal(f.sent.at(-1).reason, "LEAVING");
  passed("Offline failures recover without charging the gap; navigation sends a final pause");

  let complete; const states = [], sent = [];
  const controller = new ActiveTimeController({ clientAccountId: "client", tabId: randomUUID(), now: () => 0, available: () => "ACTIVE",
    onChange: state => states.push(state), onSaved: () => {},
    send: input => { sent.push(input); return input.action === "HEARTBEAT" ? new Promise(resolve => { complete = resolve; }) : Promise.resolve({ clientAccountId: "client", trackedSeconds: 20, ignored: false, isRunning: false, timeLogId: "log" }); },
  });
  const first = controller.tick(); await Promise.resolve();
  for (let i = 0; i < 20; i++) { controller.activity(); controller.tick(); }
  const pause = controller.setPaused(true);
  complete({ clientAccountId: "client", trackedSeconds: 20, ignored: false, isRunning: true, timeLogId: "log" });
  await first; await pause;
  assert.equal(sent.filter(input => input.action === "HEARTBEAT").length, 1);
  assert.equal(states.at(-1).status, "PAUSED");
  assert.ok(states.slice(states.findIndex(state => state.status === "PAUSED")).every(state => state.status !== "RUNNING"));
  passed("A delayed heartbeat cannot undo a manual pause, and activity cannot flood in-flight requests");

  let failHeartbeat; const recoverySent = [];
  const recovery = new ActiveTimeController({ clientAccountId: "client", tabId: randomUUID(), now: () => 0, available: () => "ACTIVE", onChange: () => {}, onSaved: () => {},
    send: input => { recoverySent.push(input); return input.action === "HEARTBEAT" ? new Promise((resolve, reject) => { failHeartbeat = reject; }) : Promise.resolve({ clientAccountId: "client", trackedSeconds: 0, ignored: false, isRunning: false, timeLogId: null }); },
  });
  const running = recovery.tick(); await Promise.resolve();
  const stopping = recovery.setPaused(true); failHeartbeat(new Error("Connection lost"));
  await running; await stopping;
  assert.equal(recoverySent.at(-1).action, "PAUSE"); assert.equal(recoverySent.at(-1).reset, true);
  passed("A pause queued after a connection failure discards the uncertain interval");
}
async function main() {
  try { await databaseChecks(); await browserChecks(); console.log(`${checks} active time tracking checks passed.`); }
  finally { await prisma.organization.deleteMany({ where: { id: { in: [ids.org, ids.foreign] } } }); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
