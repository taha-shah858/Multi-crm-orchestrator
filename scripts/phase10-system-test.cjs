/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * Focused Phase 10 system test.
 *
 * It invokes App Router handlers with the same development session and
 * active-client cookies used by the dashboard, then verifies persisted data
 * through a fresh Node process with `--verify <marker>`.
 */
const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");
const { File } = require("node:buffer");

const root = path.resolve(__dirname, "..");
const marker = process.argv[3] || `phase10-${Date.now()}`;
const atlas = "client-atlas-revenue";
const northstar = "client-northstar-growth";

for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the Phase 10 system test.");
process.env.NODE_ENV = "development";

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) request = path.join(root, "src", request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};
require.extensions[".ts"] = function compileTypeScript(mod, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  mod._compile(output, filename);
};

const { NextRequest } = require("next/server");
const route = (relativePath) => require(path.join(root, "src", "app", "api", ...relativePath.split("/"), "route.ts"));
const routes = {
  contacts: route("contacts"),
  sync: route("contacts/import"),
  history: route("sync/history"),
  interactions: route("interactions"),
  identities: route("communications/identities"),
  dispatch: route("communications/dispatch"),
  analyses: route("lead-analyses"),
  analysis: route("lead-analyses/[id]"),
  scripts: route("scripts"),
  generateScript: route("scripts/generate"),
  script: route("scripts/[id]"),
  schedule: route("calendar/schedule"),
  appointment: route("calendar/events/[id]"),
  commissions: route("commissions"),
  commission: route("commissions/[id]"),
  timeLogs: route("time-logs"),
  timeLog: route("time-logs/[id]"),
  documents: route("documents"),
  document: route("documents/[id]"),
  generateDocument: route("documents/generate"),
  uploadDocument: route("documents/upload"),
  downloadDocument: route("documents/[id]/download"),
};
const { prisma } = require(path.join(root, "src", "lib", "db", "prisma.ts"));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function request(clientId, pathname, method = "GET", body, headers = {}) {
  const hasJsonBody = body !== undefined && !(body instanceof FormData);
  return new NextRequest(`http://localhost${pathname}`, {
    method,
    headers: {
      cookie: `multi_crm_session=active; multi_crm_active_client=${clientId}`,
      ...(hasJsonBody ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: hasJsonBody ? JSON.stringify(body) : body,
  });
}

async function invoke(handler, clientId, pathname, method = "GET", body, params) {
  const response = params
    ? await handler[method](request(clientId, pathname, method, body), { params: Promise.resolve(params) })
    : await handler[method](request(clientId, pathname, method, body));
  const contentType = response.headers.get("content-type") ?? "";
  return { response, data: contentType.includes("application/json") ? await response.json() : null };
}

async function expectSuccess(handler, clientId, pathname, method = "GET", body, params) {
  const result = await invoke(handler, clientId, pathname, method, body, params);
  assert(result.response.ok && result.data?.success, `${method} ${pathname} failed: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function expectError(handler, clientId, pathname, method, body, status, code, params) {
  const result = await invoke(handler, clientId, pathname, method, body, params);
  assert(result.response.status === status, `${method} ${pathname} expected ${status}, received ${result.response.status}`);
  assert(result.data?.success === false && result.data?.error?.code === code, `${method} ${pathname} expected ${code}, received ${JSON.stringify(result.data)}`);
}

async function verifyPersistence() {
  const [contacts, interactions, analyses, scripts, calendar, operations, documents, history] = await Promise.all([
    expectSuccess(routes.contacts, atlas, "/api/contacts"),
    expectSuccess(routes.interactions, atlas, "/api/interactions"),
    expectSuccess(routes.analyses, atlas, "/api/lead-analyses"),
    expectSuccess(routes.scripts, atlas, "/api/scripts"),
    expectSuccess(route("calendar/events"), atlas, "/api/calendar/events"),
    expectSuccess(routes.commissions, atlas, "/api/commissions"),
    expectSuccess(routes.documents, atlas, "/api/documents"),
    expectSuccess(routes.history, atlas, "/api/sync/history"),
  ]);

  assert(contacts.contacts.length > 0, "Persisted contacts were not available after process restart.");
  assert(interactions.interactions.some((item) => item.subject?.includes(marker)), "Persisted interaction was not available after process restart.");
  assert(analyses.analyses.some((item) => item.transcript?.includes(marker)), "Persisted lead analysis was not available after process restart.");
  assert(scripts.scripts.some((item) => item.purpose?.includes(marker)), "Persisted script was not available after process restart.");
  assert(calendar.appointments.some((item) => item.title?.includes(marker)), "Persisted appointment was not available after process restart.");
  assert(operations.commissions.some((item) => item.deal?.title?.includes(marker)), "Persisted deal/commission was not available after process restart.");
  assert(operations.timeLogs.some((item) => item.description?.includes(marker)), "Persisted time log was not available after process restart.");
  assert(documents.documents.some((item) => item.title?.includes(marker)), "Persisted document was not available after process restart.");
  assert(history.runs.length > 0, "Persisted sync history was not available after process restart.");

  console.log(JSON.stringify({ phase: 10, mode: "verify", marker, status: "passed" }));
}

async function run() {
  if (process.argv[2] === "--verify") return verifyPersistence();

  const unauthenticated = await routes.contacts.GET(new NextRequest("http://localhost/api/contacts"));
  const unauthenticatedData = await unauthenticated.json();
  assert(unauthenticated.status === 401 && unauthenticatedData.error?.code === "UNAUTHENTICATED", "Unauthenticated API access was not rejected safely.");

  await expectSuccess(routes.sync, atlas, "/api/contacts/import", "POST");
  await expectSuccess(routes.sync, northstar, "/api/contacts/import", "POST");
  const atlasContacts = (await expectSuccess(routes.contacts, atlas, "/api/contacts")).contacts;
  const northstarContacts = (await expectSuccess(routes.contacts, northstar, "/api/contacts")).contacts;
  assert(atlasContacts.length >= 2 && northstarContacts.length >= 1, "Both client accounts need persisted contacts for Phase 10 testing.");
  const atlasContact = atlasContacts[0];
  const atlasOtherContact = atlasContacts.find((contact) => contact.id !== atlasContact.id);
  assert(!northstarContacts.some((contact) => contact.id === atlasContact.id), "Contact list leaked an Atlas record into Northstar.");

  const interaction = (await expectSuccess(routes.interactions, atlas, "/api/interactions", "POST", {
    type: "CALL", direction: "OUTBOUND", contactId: atlasContact.id, subject: `Discovery call ${marker}`,
    body: `The prospect is ready to schedule a proposal review next week with a $25000 budget. ${marker}`,
  })).interaction;
  await expectError(routes.interactions, atlas, "/api/interactions", "POST", {}, 422, "INVALID_INTERACTION_INPUT");

  const identity = (await expectSuccess(routes.identities, atlas, "/api/communications/identities")).identities[0];
  assert(identity, "The active client has no communication identity.");
  const communication = (await expectSuccess(routes.dispatch, atlas, "/api/communications/dispatch", "POST", {
    kind: "SMS", mode: "MANUAL", identityId: identity.id, contactId: atlasContact.id, body: `Manual Phase 10 follow-up ${marker}`,
  })).interaction;
  assert(communication.clientAccountId === atlas, "Manual communication was not persisted for the active client.");

  const analysis = (await expectSuccess(routes.analyses, atlas, "/api/lead-analyses", "POST", {
    contactId: atlasContact.id, interactionId: interaction.id,
    transcript: `We need security and onboarding, have a $25000 budget, and want to move forward next week. ${marker}`,
  })).analysis;
  assert(analysis.contactId === atlasContact.id && analysis.interactionId === interaction.id, "Lead analysis did not retain canonical contact/interaction links.");
  await expectError(routes.analyses, atlas, "/api/lead-analyses", "POST", { contactId: atlasOtherContact.id, interactionId: interaction.id, transcript: marker }, 422, "LEAD_ANALYSIS_LINK_MISMATCH");

  const script = (await expectSuccess(routes.generateScript, atlas, "/api/scripts/generate", "POST", {
    contactId: atlasContact.id, leadAnalysisId: analysis.id, channel: "EMAIL", purpose: `Phase 10 follow-up ${marker}`,
  })).script;
  assert(script.contactId === atlasContact.id && script.leadAnalysisId === analysis.id, "Generated script did not retain canonical contact/analysis links.");
  await expectSuccess(routes.script, atlas, `/api/scripts/${script.id}`, "PATCH", { content: `${script.content}\n\nManual review ${marker}` }, { id: script.id });
  await expectError(routes.generateScript, atlas, "/api/scripts/generate", "POST", { contactId: atlasOtherContact.id, leadAnalysisId: analysis.id, channel: "EMAIL", purpose: marker }, 422, "LEAD_ANALYSIS_LINK_MISMATCH");

  const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  const appointment = (await expectSuccess(routes.schedule, atlas, "/api/calendar/schedule", "POST", {
    title: `Proposal review ${marker}`, contactId: atlasContact.id, interactionId: interaction.id,
    startTime: startTime.toISOString(), endTime: endTime.toISOString(), provider: "MOCK",
  })).appointment;
  assert(appointment.contactId === atlasContact.id && appointment.interactionId === interaction.id, "Appointment did not retain canonical contact/interaction links.");
  await expectSuccess(routes.appointment, atlas, `/api/calendar/events/${appointment.id}`, "PATCH", { status: "CONFIRMED" }, { id: appointment.id });
  await expectError(routes.schedule, atlas, "/api/calendar/schedule", "POST", { title: marker, contactId: atlasOtherContact.id, interactionId: interaction.id, startTime: startTime.toISOString(), endTime: endTime.toISOString() }, 422, "APPOINTMENT_LINK_MISMATCH");
  await expectError(routes.schedule, atlas, "/api/calendar/schedule", "POST", { title: marker, contactId: atlasContact.id, startTime: startTime.toISOString(), endTime: endTime.toISOString(), provider: "GOOGLE" }, 422, "CALENDAR_PROVIDER_UNAVAILABLE");

  const commission = (await expectSuccess(routes.commissions, atlas, "/api/commissions", "POST", {
    dealTitle: `Phase 10 deal ${marker}`, contactId: atlasContact.id, dealValue: 25000, expectedCommission: 2500, receivedCommission: 0, currency: "USD", notes: marker,
  })).commission;
  assert(commission.deal?.contact?.id === atlasContact.id, "Commission deal did not retain its canonical contact link.");
  const adjustedCommission = (await expectSuccess(routes.commission, atlas, `/api/commissions/${commission.id}`, "PATCH", { action: "LEDGER", type: "PAYMENT", amount: 250, note: `Manual payment ${marker}` }, { id: commission.id })).commission;
  assert(adjustedCommission.isManualOverride, "Manual commission ledger adjustment was not retained.");
  const ledgerEntry = adjustedCommission.ledgerEntries.find((entry) => entry.note === `Manual payment ${marker}`);
  const ledgerAudit = ledgerEntry && await prisma.auditLog.findFirst({ where: { organizationId: "dev-company-zenith", clientAccountId: atlas, action: "COMMISSION_LEDGER_ADJUSTED", entityType: "COMMISSION_LEDGER_ENTRY", entityId: ledgerEntry.id } });
  assert(ledgerAudit, "Commission ledger audit did not point to the canonical ledger entry.");

  const timeLog = (await expectSuccess(routes.timeLogs, atlas, "/api/time-logs", "POST", { contactId: atlasContact.id, minutes: 60, description: `Phase 10 account work ${marker}` })).timeLog;
  const updatedTimeLog = (await expectSuccess(routes.timeLog, atlas, `/api/time-logs/${timeLog.id}`, "PATCH", { minutes: 75, description: `Phase 10 corrected account work ${marker}` }, { id: timeLog.id })).timeLog;
  assert(updatedTimeLog.isManualOverride && updatedTimeLog.minutes === 75, "Manual time-log correction was not retained.");

  const document = (await expectSuccess(routes.generateDocument, atlas, "/api/documents/generate", "POST", {
    type: "PROPOSAL", contactId: atlasContact.id, leadAnalysisId: analysis.id, dealId: commission.deal.id,
  })).document;
  assert(document.contact?.id === atlasContact.id && document.leadAnalysis?.id === analysis.id && document.deal?.id === commission.deal.id, "Generated proposal did not retain canonical context links.");
  const updatedDocument = (await expectSuccess(routes.document, atlas, `/api/documents/${document.id}`, "PATCH", { title: `Reviewed proposal ${marker}`, content: `${document.content}\n\nApproved by agent.`, status: "FINAL" }, { id: document.id })).document;
  assert(updatedDocument.isManualOverride && updatedDocument.status === "FINAL", "Manual document review was not retained.");
  await expectError(routes.generateDocument, atlas, "/api/documents/generate", "POST", { type: "PROPOSAL", contactId: atlasOtherContact.id, leadAnalysisId: analysis.id, dealId: commission.deal.id }, 422, "DOCUMENT_CONTEXT_LINK_MISMATCH");

  const form = new FormData();
  form.set("title", `Uploaded proposal ${marker}`);
  form.set("contactId", atlasContact.id);
  form.set("file", new File([Buffer.from("%PDF-1.4\nphase10")], `${marker}.pdf`, { type: "application/pdf" }));
  const uploaded = (await expectSuccess(routes.uploadDocument, atlas, "/api/documents/upload", "POST", form)).document;
  const download = await invoke(routes.downloadDocument, atlas, `/api/documents/${uploaded.id}/download`, "GET", undefined, { id: uploaded.id });
  assert(download.response.ok && (await download.response.arrayBuffer()).byteLength > 0, "Uploaded PDF could not be downloaded.");

  const northstarLists = await Promise.all([
    expectSuccess(routes.interactions, northstar, "/api/interactions"), expectSuccess(routes.analyses, northstar, "/api/lead-analyses"),
    expectSuccess(routes.scripts, northstar, "/api/scripts"), expectSuccess(route("calendar/events"), northstar, "/api/calendar/events"),
    expectSuccess(routes.commissions, northstar, "/api/commissions"), expectSuccess(routes.timeLogs, northstar, "/api/time-logs"), expectSuccess(routes.documents, northstar, "/api/documents"),
  ]);
  const leaked = [
    northstarLists[0].interactions.some((item) => item.id === interaction.id), northstarLists[1].analyses.some((item) => item.id === analysis.id),
    northstarLists[2].scripts.some((item) => item.id === script.id), northstarLists[3].appointments.some((item) => item.id === appointment.id),
    northstarLists[4].commissions.some((item) => item.id === commission.id), northstarLists[5].timeLogs.some((item) => item.id === timeLog.id),
    northstarLists[6].documents.some((item) => item.id === document.id),
  ];
  assert(!leaked.some(Boolean), "A client-scoped list leaked an Atlas record into Northstar.");

  await expectError(routes.interactions, northstar, "/api/interactions", "POST", { type: "NOTE", body: marker, contactId: atlasContact.id }, 404, "CONTACT_NOT_FOUND");
  await expectError(routes.analysis, northstar, `/api/lead-analyses/${analysis.id}`, "PATCH", { summary: marker }, 404, "LEAD_ANALYSIS_NOT_FOUND", { id: analysis.id });
  await expectError(routes.script, northstar, `/api/scripts/${script.id}`, "PATCH", { content: marker }, 404, "SCRIPT_NOT_FOUND", { id: script.id });
  await expectError(routes.appointment, northstar, `/api/calendar/events/${appointment.id}`, "PATCH", { status: "CANCELLED" }, 404, "APPOINTMENT_NOT_FOUND", { id: appointment.id });
  await expectError(routes.commission, northstar, `/api/commissions/${commission.id}`, "PATCH", { expectedCommission: 1 }, 404, "COMMISSION_NOT_FOUND", { id: commission.id });
  await expectError(routes.timeLog, northstar, `/api/time-logs/${timeLog.id}`, "PATCH", { minutes: 1 }, 404, "TIME_LOG_NOT_FOUND", { id: timeLog.id });
  await expectError(routes.document, northstar, `/api/documents/${document.id}`, "PATCH", { content: marker }, 404, "DOCUMENT_NOT_FOUND", { id: document.id });
  await expectError(routes.documents, northstar, "/api/documents", "POST", { type: "MANUAL_NOTE", title: marker, content: marker, contactId: atlasContact.id }, 404, "CONTACT_NOT_FOUND");

  const history = await expectSuccess(routes.history, atlas, "/api/sync/history");
  assert(history.runs.length > 0, "Sync history was not persisted.");
  console.log(JSON.stringify({ phase: 10, mode: "create", marker, status: "passed" }));
}

run()
  .catch((error) => { console.error(error.stack || error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
