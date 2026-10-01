/* eslint-disable @typescript-eslint/no-require-imports -- This CJS harness loads real TypeScript services through a controlled require hook. */
/* Service and route regression checks using isolated database/provider doubles.
 * No environment files, live databases, credentials, or network calls are used. */
const assert = require("node:assert/strict");
const { test, beforeEach, after } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const now = new Date("2026-10-01T00:00:00Z");
const context = (client = "a") => ({ activeClientAccountId: client, user: { id: "agent", organizationId: "org", role: "AGENT", name: "Agent", email: "agent@example.invalid" } });
const connection = (id = "zoho-a", provider = "ZOHO", client = "a", extra = {}) => ({ id, organizationId: "org", clientAccountId: client, ownershipType: "CLIENT_ACCOUNT", provider, status: "CONNECTED", updatedAt: now, ...extra });
const record = (extra = {}) => ({ id: "record", organizationId: "org", clientAccountId: "a", connectionId: "zoho-a", provider: "ZOHO", recordType: "CONTACT", externalId: "12345", name: "Original", email: null, phone: null, companyName: null, status: null, stage: null, amount: null, details: null, customFields: { source: "PROVIDER_IMPORT", providerRecordId: "12345" }, lastSyncedAt: now, createdAt: now, updatedAt: now, ...extra });
const deal = (extra = {}) => ({ id: "deal", organizationId: "org", clientAccountId: "a", userId: "agent", title: "Sale", valueCents: 10000, currency: "USD", status: "OPEN", contactId: null, closedAt: null, notes: null, commissionRate: null, expectedRevenueCents: null, ...extra });
const handoff = (extra = {}) => ({ id: "handoff", organizationId: "org", clientAccountId: "a", agencyDealId: "deal", agentId: "agent", dealName: "Sale", dealAmountCents: 10000, currency: "USD", closeStatus: "CLOSED_WON", closeDate: now, closeOutcome: null, recommendedNextAction: null, notes: null, clientCrmProvider: "ZOHO", clientCrmRecordId: null, status: "FAILED", retryCount: 0, lastAttemptedAt: null, lastSuccessfulSyncAt: null, lastError: null, createdAt: now, updatedAt: now, ...extra });
let state;

// Evaluate the subset of Prisma predicates used here, rather than bypassing
// authorization. Omitting organization/assignment/provider filters fails tests.
function matches(row, where = {}) {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return expected.some((clause) => matches(row, clause));
    if (key === "AND") return expected.every((clause) => matches(row, clause));
    if (key.includes("_")) return matches(row, expected);
    const value = row[key];
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("in" in expected) return expected.in.includes(value);
      if ("some" in expected) return Array.isArray(value) && value.some((item) => matches(item, expected.some));
      return value != null && matches(value, expected);
    }
    return expected === undefined || value === expected;
  });
}

function hydrate(model, row, args = {}) {
  if (!row) return null;
  const result = structuredClone(row);
  if (model === "handoffs") {
    result.agencyDeal = structuredClone(state.deals.find((item) => item.id === row.agencyDealId));
    result.clientAccount = { id: row.clientAccountId, name: row.clientAccountId };
    result.agent = { id: "agent", name: "Agent", email: "agent@example.invalid" };
  }
  if (model === "contacts" && args.include?.externalRecords?.where) {
    result.externalRecords = result.externalRecords.filter((item) => matches(item, args.include.externalRecords.where));
  }
  return result;
}

function table(model) {
  const rows = () => state[model];
  const write = (method, args) => state.writes.push({ model, method, args });
  return {
    findFirst: async (args) => hydrate(model, rows().find((row) => matches(row, args.where)), args),
    findUnique: async (args) => hydrate(model, rows().find((row) => matches(row, args.where)), args),
    findMany: async (args) => rows().filter((row) => matches(row, args.where)).map((row) => hydrate(model, row, args)),
    update: async (args) => {
      write("update", args);
      const row = rows().find((item) => matches(item, args.where));
      assert.ok(row, "update target must exist");
      for (const [key, value] of Object.entries(args.data)) {
        row[key] = value && typeof value === "object" && "increment" in value ? row[key] + value.increment : value;
      }
      return hydrate(model, row, args);
    },
    upsert: async (args) => {
      write("upsert", args);
      let row = rows().find((item) => matches(item, args.where));
      if (row) Object.assign(row, args.update);
      else {
        row = model === "records" ? record({ id: "import-" + rows().length, ...args.create }) : handoff({ ...args.create });
        rows().push(row);
      }
      return hydrate(model, row, args);
    },
    deleteMany: async () => { throw new Error("CRM record deletion is forbidden in this regression suite"); },
    updateMany: async () => { throw new Error("Inferred CRM bulk updates are forbidden"); },
    create: async (args) => {
      write("create", args);
      if (model === "contacts") {
        const { externalRecords, ...data } = args.data;
        const row = { id: "contact-" + rows().length, createdAt: now, updatedAt: now, crmOwner: null, crmCompany: null, dealLinks: [], deals: [], interactions: [], externalRecords: [], ...data };
        if (externalRecords?.create) {
          const mapping = { id: "external-" + state.externalRecords.length, contactId: row.id, ...externalRecords.create };
          state.externalRecords.push(mapping);
          row.externalRecords.push({ ...mapping, connection: state.connections.find((item) => item.id === mapping.connectionId) });
        }
        rows().push(row); return hydrate(model, row, args);
      }
      if (model === "syncRuns" || model === "audits") {
        const row = { id: model + "-" + rows().length, ...args.data };
        rows().push(row); return hydrate(model, row, args);
      }
      throw new Error("Unexpected database create for " + model);
    },
  };
}
const prisma = {
  clientAccount: table("clients"), integrationConnection: table("connections"), clientCrmRecord: table("records"),
  contact: table("contacts"), deal: table("deals"), dealHandoff: table("handoffs"), user: table("users"),
  integrationCredential: { findUnique: async () => state.credential },
  externalRecord: table("externalRecords"), syncRun: table("syncRuns"), crmPipeline: table("pipelines"), auditLog: table("audits"),
  $transaction: async (operation) => typeof operation === "function" ? operation(prisma) : Promise.all(operation),
};

function providerCall(kind, connection, externalId) {
  state.providers.push({ kind, connectionId: connection.id, externalId });
  if (state.providerFailure) throw new Error("Provider unavailable");
}
const zohoDouble = {
  fetchZohoRecords: async (connection) => { providerCall("ZOHO_IMPORT", connection); return state.imports; },
  createOrUpdateZohoRecord: async (connection, type, data, externalId) => { providerCall("ZOHO_UPDATE", connection, externalId); assert.ok(externalId, "editing cannot create a remote record"); return { externalId }; },
  syncHandoffToZoho: async (connection) => { providerCall("ZOHO_HANDOFF", connection); return { externalId: "zoho-deal" }; },
};
const legacyDouble = {
  fetchActiveCampaignRecords: async (connection) => { providerCall("LEGACY_IMPORT", connection); return state.imports; },
  createOrUpdateActiveCampaignRecord: async (connection, type, data, externalId) => { providerCall("LEGACY_UPDATE", connection, externalId); return { externalId }; },
  syncHandoffToActiveCampaign: async (connection) => { providerCall("LEGACY_HANDOFF", connection); return { externalId: "legacy-deal" }; },
};
const hubspotDouble = {
  fetchSalesCrm: async (connection) => {
    providerCall("HUBSPOT_IMPORT", connection);
    return state.salesSnapshot;
  },
};

const originalLoad = Module._load;
const originalResolve = Module._resolveFilename;
const originalFetch = global.fetch;
const originalNodeEnv = process.env.NODE_ENV;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "@/lib/db/prisma") return { prisma };
  if (request === "@/lib/audit/audit-log") return { recordAuditEvent: async (context, event) => state.audits.push(event) };
  if (request === "@/lib/auth/request-context") return { requireRequestContext: async () => context() };
  if (request === "@/lib/integrations/credential-crypto") return { decryptIntegrationSecret: () => state.token, encryptIntegrationSecret: (value) => value };
  if (request === "@/lib/integrations/zoho/client") return zohoDouble;
  if (request === "@/lib/integrations/activecampaign/client") return legacyDouble;
  if (request === "@/lib/agent-crm/agent-sales-service") return { syncDealToClickUp: async () => {} };
  if (request === "@/lib/integrations/registry") return {
    getCrmAdapter: (provider) => { assert.equal(provider, "HUBSPOT"); return hubspotDouble; },
    getIntegrationAdapter: (provider) => { assert.equal(provider, "HUBSPOT"); return hubspotDouble; },
  };
  return originalLoad.call(this, request, parent, isMain);
};
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith("@/")) request = path.join(root, "src", request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};
require.extensions[".ts"] = function (mod, filename) {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
global.fetch = async (...args) => {
  state.http.push(args);
  if (!state.fetchResponse) throw new Error("Unexpected network request; live network is disabled");
  return state.fetchResponse(...args);
};
process.env.NODE_ENV = "test";

const client = require(path.join(root, "src/lib/client-crm/client-crm-service.ts"));
const handoffs = require(path.join(root, "src/lib/handoff/handoff-service.ts"));
const contacts = require(path.join(root, "src/lib/sync/contact-sync-service.ts"));
const zoho = require(path.join(root, "src/lib/integrations/zoho/client.ts"));
const legacy = require(path.join(root, "src/lib/integrations/activecampaign/client.ts"));
const { NextRequest } = require("next/server");
const recordsRoute = require(path.join(root, "src/app/api/client-crm/records/route.ts"));
const syncRoute = require(path.join(root, "src/app/api/client-crm/sync/route.ts"));
const handoffRoute = require(path.join(root, "src/app/api/handoffs/route.ts"));
const retryRoute = require(path.join(root, "src/app/api/handoffs/[id]/retry/route.ts"));
const contactsRoute = require(path.join(root, "src/app/api/contacts/route.ts"));
const importRoute = require(path.join(root, "src/app/api/contacts/import/route.ts"));
const directoryLoader = require(path.join(root, "src/lib/leads/load-directory.ts"));
const integrationService = require(path.join(root, "src/lib/integrations/integration-service.ts"));
const { repairAgencyHubSpotOwnership } = require("./repair-agency-hubspot-ownership.cjs");

beforeEach(() => {
  state = {
    clients: ["a", "b"].map((id) => ({ id, organizationId: "org", status: "ACTIVE", agentAssignments: id === "a" ? [{ userId: "agent" }] : [], defaultCommissionRate: 10 })),
    users: [{ id: "agent", defaultCommissionRate: 10 }], connections: [connection()], records: [], contacts: [], deals: [], handoffs: [],
    externalRecords: [], syncRuns: [], pipelines: [],
    salesSnapshot: { contacts: [{ id: "hubspot-contact", first_name: "Agency", last_name: "Lead", email: "lead@example.invalid" }], contactRecords: [], companies: [], deals: [], owners: [], pipelines: [], activities: [], failures: [] },
    writes: [], providers: [], http: [], audits: [], imports: [{ recordType: "CONTACT", externalId: "12345", name: "Imported" }],
    credential: { encryptedAccessToken: "fixture", metadata: { apiDomain: "https://zoho.example.com", apiUrl: "https://legacy.example.com/api/3" } }, token: "fixture-token",
  };
});
after(() => { Module._load = originalLoad; Module._resolveFilename = originalResolve; global.fetch = originalFetch; if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv; });
const denied = (promise) => assert.rejects(promise, { code: "CLIENT_ACCESS_DENIED" });
const request = (url, body) => new NextRequest("http://localhost" + url, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

for (const populated of [false, true]) test("CRM GET is read-only: " + (populated ? "populated" : "empty"), async () => {
  if (populated) state.records = [record({ recordType: "COMPANY" }), record({ id: "manual", connectionId: null })];
  const before = structuredClone(state.records);
  const response = await recordsRoute.GET(request("/api/client-crm/records"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).records.length, before.length);
  assert.deepEqual(state.records, before);
  assert.deepEqual(state.writes, []); assert.deepEqual(state.providers, []); assert.deepEqual(state.http, []);
});

test("explicit import preserves unrelated/manual rows and records trustworthy provenance", async () => {
  state.records = [record({ id: "company", recordType: "COMPANY" }), record({ id: "mirror", externalId: "98765", customFields: { source: "UNIFIED_DIRECTORY" } }), record({ id: "manual", connectionId: null, externalId: "ac-101" })];
  const before = structuredClone(state.records);
  assert.equal((await client.syncClientCrm(context())).count, 1);
  for (const row of before) assert.deepEqual(state.records.find((item) => item.id === row.id), row);
  assert.equal(state.records.at(-1).customFields.providerRecordId, "12345");
  assert.equal(state.providers[0].connectionId, "zoho-a");
});
test("empty provider import preserves saved data", async () => {
  state.records = [record()]; state.imports = [];
  assert.equal((await client.syncClientCrm(context())).count, 0);
  assert.equal(state.records.length, 1); assert.deepEqual(state.writes, []);
});
test("failed import is not success and preserves local records", async () => {
  state.records = [record()]; state.providerFailure = true;
  await assert.rejects(client.syncClientCrm(context()), { code: "SYNC_FAILED" });
  assert.deepEqual(state.writes, []); assert.equal(state.audits.at(-1).action, "CLIENT_CRM_SYNC_FAILED");
});
for (const provider of ["TWILIO", "HUBSPOT", "CLICKUP", "GOOGLE_CALENDAR", "ACTIVECAMPAIGN"]) test("Zoho import never falls back to " + provider, async () => {
  state.connections = [connection("other", provider)];
  await assert.rejects(client.syncClientCrm(context()), { code: "CRM_PROVIDER_UNAVAILABLE" });
  assert.deepEqual(state.providers, []); assert.deepEqual(state.writes, []);
});
test("wrong owner and disconnected connections cannot be selected", async () => {
  state.connections = [connection("agency", "ZOHO", "a", { ownershipType: "COMPANY" }), connection("disconnected", "ZOHO", "a", { status: "DISCONNECTED" })];
  await assert.rejects(client.syncClientCrm(context()), { code: "CRM_PROVIDER_UNAVAILABLE" });
});
test("explicit legacy import stays isolated", async () => {
  state.connections.push(connection("legacy", "ACTIVECAMPAIGN"));
  await client.syncClientCrm(context(), "ACTIVECAMPAIGN");
  assert.deepEqual(state.providers.map((item) => item.kind), ["LEGACY_IMPORT"]);
});
test("selected legacy integration sync uses that exact connection", async () => {
  const selected = connection("legacy-selected", "ACTIVECAMPAIGN");
  state.connections.push(connection("legacy-other", "ACTIVECAMPAIGN"), selected);
  const result = await contacts.syncSingleConnectionContacts(context(), selected, "request");
  assert.equal(result.recordsRead, 1);
  assert.deepEqual(state.providers.map((item) => [item.kind, item.connectionId]), [["LEGACY_IMPORT", "legacy-selected"]]);
});
test("verified edit uses exact destination ID without editing agency contact", async () => {
  state.records = [record()]; state.contacts = [{ id: "agency-contact", name: "Agency", email: "same@example.invalid" }];
  const result = await client.updateClientCrmRecord(context(), "record", { name: "Edited" });
  assert.equal(result.outboundStatus, "COMPLETED"); assert.equal(result.record.name, "Edited");
  assert.equal(state.providers[0].externalId, "12345"); assert.equal(state.contacts[0].name, "Agency");
  assert.ok(new Date(result.record.lastSyncedAt) > now);
});
test("failed remote edit preserves the edit and previous success timestamp", async () => {
  state.records = [record()]; state.providerFailure = true;
  const result = await client.updateClientCrmRecord(context(), "record", { name: "Retained" });
  assert.equal(result.outboundStatus, "FAILED"); assert.equal(result.record.name, "Retained");
  assert.equal(result.record.lastSyncedAt, now.toISOString()); assert.equal(result.record.customFields.outboundSyncStatus, "FAILED");
});
test("plausible numeric agency ID in a mirror cannot trigger a remote edit or create", async () => {
  state.records = [record({ customFields: { source: "UNIFIED_DIRECTORY", contactId: "agency" } })];
  const result = await client.updateClientCrmRecord(context(), "record", { name: "Local" });
  assert.equal(result.outboundStatus, "UNMAPPED"); assert.equal(result.record.name, "Local"); assert.deepEqual(state.providers, []);
});
test("provider mismatch cannot use an unrelated connection", async () => {
  state.connections = [connection("zoho-a", "TWILIO")]; state.records = [record()];
  assert.equal((await client.updateClientCrmRecord(context(), "record", { name: "Local" })).outboundStatus, "NOT_CONNECTED");
  assert.deepEqual(state.providers, []);
});
test("Zoho COMPANY edit remains local, never becomes a contact", async () => {
  state.records = [record({ recordType: "COMPANY" })];
  assert.equal((await client.updateClientCrmRecord(context(), "record", { name: "Local" })).outboundStatus, "UNSUPPORTED");
  assert.deepEqual(state.providers, []);
});
test("cross-client record edit is denied before writes", async () => {
  state.records = [record({ clientAccountId: "b" })];
  await assert.rejects(client.updateClientCrmRecord(context(), "record", { name: "Forbidden" }), { code: "RECORD_NOT_FOUND" });
  assert.deepEqual(state.writes, []);
});
test("handoff create denies unassigned target before closing deal", async () => {
  state.deals = [deal({ clientAccountId: "b" })];
  await denied(handoffs.createDealHandoffFromAgencyDeal(context(), "deal"));
  assert.deepEqual(state.writes, []); assert.deepEqual(state.providers, []);
});
for (const method of ["retryDealHandoff", "dispatchHandoffToClientCrm"]) test(method + " authorizes actual target", async () => {
  state.deals = [deal({ clientAccountId: "b" })]; state.handoffs = [handoff({ clientAccountId: "b" })];
  await denied(handoffs[method](context(), "handoff")); assert.deepEqual(state.writes, []); assert.deepEqual(state.providers, []);
});
test("even an assigned second client requires switching before mutation", async () => {
  state.clients[1].agentAssignments = [{ userId: "agent" }]; state.deals = [deal({ clientAccountId: "b" })];
  await denied(handoffs.createDealHandoffFromAgencyDeal(context(), "deal")); assert.deepEqual(state.writes, []);
});
test("handoff list overrides require actual target access", async () => {
  await denied(handoffs.listDealHandoffs(context(), { clientAccountId: "b" }));
  state.clients[1].agentAssignments = [{ userId: "agent" }]; state.deals = [deal({ clientAccountId: "b" })]; state.handoffs = [handoff({ clientAccountId: "b" })];
  assert.equal((await handoffs.listDealHandoffs(context(), { clientAccountId: "b" })).length, 1);
});
test("foreign organization handoff is hidden", async () => {
  state.handoffs = [handoff({ organizationId: "other" })];
  await assert.rejects(handoffs.retryDealHandoff(context(), "handoff"), { code: "HANDOFF_NOT_FOUND" });
  assert.deepEqual(state.writes, []);
});
test("missing Zoho records failed handoff without redirecting to another CRM", async () => {
  state.connections = [connection("legacy", "ACTIVECAMPAIGN")]; state.deals = [deal()];
  const result = await handoffs.createDealHandoffFromAgencyDeal(context(), "deal");
  assert.equal(result.status, "FAILED"); assert.equal(result.clientCrmProvider, "ZOHO"); assert.deepEqual(state.providers, []);
});
test("successful handoff saves provenance and repeated successful dispatch does not resend", async () => {
  state.deals = [deal()]; const result = await handoffs.createDealHandoffFromAgencyDeal(context(), "deal");
  assert.equal(result.status, "SYNCED"); assert.equal(state.records[0].customFields.dealId, "deal");
  assert.equal(state.records[0].customFields.providerRecordId, "zoho-deal");
  await handoffs.retryDealHandoff(context(), result.id);
  await handoffs.createDealHandoffFromAgencyDeal(context(), "deal");
  assert.equal(state.providers.length, 1);
});
test("existing explicitly legacy handoff uses its saved provider", async () => {
  state.connections.push(connection("legacy", "ACTIVECAMPAIGN")); state.deals = [deal()]; state.handoffs = [handoff({ clientCrmProvider: "ACTIVECAMPAIGN" })];
  assert.equal((await handoffs.retryDealHandoff(context(), "handoff")).status, "SYNCED");
  assert.equal(state.providers[0].kind, "LEGACY_HANDOFF");
});
test("existing handoff destination cannot be relabeled as another CRM", async () => {
  state.deals = [deal()]; state.handoffs = [handoff({ status: "SYNCED", clientCrmProvider: "ACTIVECAMPAIGN", clientCrmRecordId: "legacy-id" })];
  await assert.rejects(handoffs.createDealHandoffFromAgencyDeal(context(), "deal", { clientCrmProvider: "ZOHO" }), { code: "HANDOFF_TARGET_CONFLICT" });
  assert.deepEqual(state.writes, []); assert.deepEqual(state.providers, []);
  assert.equal(state.handoffs[0].clientCrmProvider, "ACTIVECAMPAIGN");
});
test("unsupported handoff provider becomes failure without provider calls", async () => {
  state.deals = [deal()]; state.handoffs = [handoff({ clientCrmProvider: "TWILIO" })];
  assert.equal((await handoffs.dispatchHandoffToClientCrm(context(), "handoff")).status, "FAILED"); assert.deepEqual(state.providers, []);
});
test("agency directory excludes private client contacts and selects agency provenance", async () => {
  const agency = { organizationId: "org", ownershipType: "COMPANY", provider: "HUBSPOT" };
  const make = (id, mappings) => ({ id, organizationId: "org", clientAccountId: "a", externalRecords: mappings, dealLinks: [], deals: [], interactions: [], crmOwner: null, crmCompany: null });
  state.contacts = [make("agency", [{ objectType: "CONTACT", externalId: "zoho-id", connection: connection() }, { objectType: "CONTACT", externalId: "hubspot-id", connection: agency }]), make("private", [{ objectType: "CONTACT", externalId: "private", connection: connection() }])];
  const result = await contacts.getActiveClientContacts(context(), { scope: "agency" });
  assert.deepEqual(result.map((item) => item.id), ["agency"]); assert.equal(result[0].externalId, "hubspot-id");
  state.clients[1].agentAssignments = [{ userId: "agent" }];
  assert.deepEqual((await contacts.getActiveClientContacts(context("b"), { scope: "agency" })).map((item) => item.id), ["agency"]);
});
test("contact override cannot bypass assignments even in agency scope", async () => {
  await denied(contacts.getActiveClientContacts(context(), { scope: "agency", clientAccountId: "b" }));
});
test("agency Import selects company HubSpot, persists visible contacts, and stays stable across clients", async () => {
  state.connections.push(connection("legacy-hubspot", "HUBSPOT"), connection("personal-hubspot", "HUBSPOT", null, { ownershipType: "USER" }), connection("agency-hubspot", "HUBSPOT", null, { ownershipType: "COMPANY" }));
  const imported = await importRoute.POST(request("/api/contacts/import", {}));
  assert.equal(imported.status, 200); assert.equal((await imported.json()).count, 1);
  assert.deepEqual(state.providers.map((item) => [item.kind, item.connectionId]), [["HUBSPOT_IMPORT", "agency-hubspot"]]);
  const response = await contactsRoute.GET(request("/api/contacts?scope=agency"));
  const rows = (await response.json()).contacts;
  assert.equal(rows.length, 1); assert.equal(rows[0].sourceCrm, "HubSpot"); assert.equal(rows[0].externalId, "hubspot-contact");
  state.clients[1].agentAssignments = [{ userId: "agent" }];
  await contacts.syncAgencyHubSpotContacts(context("b"), "second-import");
  assert.equal(state.contacts.length, 1);
  assert.deepEqual((await contacts.getActiveClientContacts(context("b"), { scope: "agency" })).map((item) => item.id), rows.map((item) => item.id));
});
test("missing agency HubSpot cannot fall back to client Zoho or legacy HubSpot", async () => {
  state.connections.push(connection("client-hubspot", "HUBSPOT"));
  const response = await importRoute.POST(request("/api/contacts/import", {}));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error.message, /agency HubSpot/i);
  assert.deepEqual(state.providers, []); assert.deepEqual(state.writes, []);
});
test("agency import rejects unauthorized selected clients before provider calls", async () => {
  state.connections.push(connection("agency", "HUBSPOT", null, { ownershipType: "COMPANY" }));
  await denied(contacts.syncAgencyHubSpotContacts(context("b"), "request"));
  assert.deepEqual(state.providers, []); assert.deepEqual(state.writes, []);
});
test("failed agency import returns failure and retains saved contacts", async () => {
  state.connections.push(connection("agency", "HUBSPOT", null, { ownershipType: "COMPANY" }));
  state.contacts = [{ id: "saved", organizationId: "org" }]; state.providerFailure = true;
  assert.equal((await importRoute.POST(request("/api/contacts/import", {}))).status, 502);
  assert.equal(state.contacts[0].id, "saved"); assert.equal(state.syncRuns[0].status, "FAILED");
});
test("failed assessments do not hide successfully loaded agency contacts", async () => {
  const result = await directoryLoader.loadAgencyDirectory(async (url) => String(url).includes("lead-analyses")
    ? Response.json({ success: false, error: { message: "Assessment error" } }, { status: 500 })
    : Response.json({ success: true, contacts: [{ id: "visible" }] }));
  assert.deepEqual(result.contacts, [{ id: "visible" }]); assert.deepEqual(result.analyses, []); assert.ok(result.analysisWarning);
});
test("non-JSON assessment responses also preserve contacts", async () => {
  const result = await directoryLoader.loadAgencyDirectory(async (url) => String(url).includes("lead-analyses")
    ? new Response("Unavailable", { status: 503 })
    : Response.json({ success: true, contacts: [{ id: "visible" }] }));
  assert.equal(result.contacts.length, 1); assert.ok(result.analysisWarning);
});
test("directory keeps available assessments and reports contact load errors", async () => {
  const result = await directoryLoader.loadAgencyDirectory(async (url) => Response.json(String(url).includes("lead-analyses")
    ? { success: true, analyses: [{ id: "analysis" }] }
    : { success: true, contacts: [{ id: "visible" }] }));
  assert.equal(result.analyses[0].id, "analysis"); assert.equal(result.analysisWarning, null);
  await assert.rejects(directoryLoader.loadAgencyDirectory(async (url) => String(url).includes("lead-analyses")
    ? Response.json({ success: true, analyses: [] })
    : Response.json({ success: false, error: { message: "Contact access denied" } }, { status: 403 })), /Contact access denied/);
});
test("ownership repair is explicit, reviewable, idempotent and keeps credentials/mappings", async () => {
  const legacy = connection("legacy-hubspot", "HUBSPOT", "a", { ownershipKey: "client:a" }); state.connections.push(legacy);
  state.externalRecords = [{ id: "mapping", connectionId: legacy.id, externalId: "12345" }];
  const credentialBefore = structuredClone(state.credential); const mappingsBefore = structuredClone(state.externalRecords);
  const plan = await repairAgencyHubSpotOwnership(prisma, legacy.id);
  assert.equal(plan.after.ownershipType, "COMPANY"); assert.deepEqual(state.writes, []);
  const result = await repairAgencyHubSpotOwnership(prisma, legacy.id, true);
  assert.equal(result.applied, true); assert.equal(legacy.id, result.connectionId); assert.equal(legacy.clientAccountId, null);
  assert.equal(state.audits.at(-1).metadata.before.ownershipKey, "client:a");
  assert.deepEqual(state.credential, credentialBefore); assert.deepEqual(state.externalRecords, mappingsBefore);
  assert.equal((await repairAgencyHubSpotOwnership(prisma, legacy.id, true)).alreadyAgencyOwned, true);
});
test("ownership repair cannot replace an existing agency account or promote Zoho/personal HubSpot", async () => {
  const legacy = connection("legacy", "HUBSPOT", "a", { ownershipKey: "client:a" }); state.connections.push(legacy, connection("agency", "HUBSPOT", null, { ownershipType: "COMPANY" }));
  await assert.rejects(repairAgencyHubSpotOwnership(prisma, legacy.id, true), /already exists/);
  await assert.rejects(repairAgencyHubSpotOwnership(prisma, "zoho-a", true), /HubSpot/);
  state.connections.push(connection("personal", "HUBSPOT", null, { ownershipType: "USER" }));
  await assert.rejects(repairAgencyHubSpotOwnership(prisma, "personal", true), /client-owned/);
  assert.deepEqual(state.writes, []);
});
test("agents may sync agency HubSpot but cannot connect/disconnect it or onboard client HubSpot", async () => {
  state.connections.push(connection("agency", "HUBSPOT", null, { ownershipType: "COMPANY" }));
  const agency = (await integrationService.listIntegrationConnections(context().user, "a")).find((item) => item.id === "agency");
  assert.equal(agency.permissions.canSync, true); assert.equal(agency.permissions.canRetry, true);
  assert.equal(agency.permissions.canConnect, false); assert.equal(agency.permissions.canDisconnect, false);
  await assert.rejects(integrationService.beginHubSpotOAuth(context().user, { ownershipType: "CLIENT_ACCOUNT" }, "a"), { code: "INVALID_INTEGRATION_TARGET" });
  await assert.rejects(integrationService.beginHubSpotOAuth(context().user, {}, "a"), { code: "FORBIDDEN" });
  assert.deepEqual(state.providers, []); assert.deepEqual(state.writes, []);
});
test("routes return 403 for forged handoff, retry, and requested client", async () => {
  state.deals = [deal({ clientAccountId: "b" })]; state.handoffs = [handoff({ clientAccountId: "b" })];
  assert.equal((await handoffRoute.POST(request("/api/handoffs", { agencyDealId: "deal" }))).status, 403);
  assert.equal((await handoffRoute.GET(request("/api/handoffs?clientAccountId=b"))).status, 403);
  assert.equal((await retryRoute.POST(request("/api/handoffs/handoff/retry", {}), { params: Promise.resolve({ id: "handoff" }) })).status, 403);
  assert.equal((await contactsRoute.GET(request("/api/contacts?clientAccountId=b"))).status, 403);
  assert.equal((await syncRoute.POST(request("/api/client-crm/sync", { clientAccountId: "b" }))).status, 403);
  assert.deepEqual(state.writes, []); assert.deepEqual(state.providers, []);
});

test("invalid sync/handoff inputs return validation errors before provider calls", async () => {
  assert.equal((await syncRoute.POST(request("/api/client-crm/sync", null))).status, 422);
  assert.equal((await syncRoute.POST(request("/api/client-crm/sync", { provider: "TWILIO" }))).status, 422);
  assert.equal((await handoffRoute.POST(request("/api/handoffs", null))).status, 422);
  assert.equal((await handoffRoute.POST(request("/api/handoffs", { agencyDealId: "deal", clientCrmProvider: "TWILIO" }))).status, 422);
  assert.deepEqual(state.writes, []); assert.deepEqual(state.providers, []);
});
test("current client CRM APIs show only Zoho while preserving legacy records", async () => {
  state.records = [record(), record({ id: "legacy", provider: "ACTIVECAMPAIGN", connectionId: "legacy" })];
  state.deals = [deal()]; state.handoffs = [handoff(), handoff({ id: "legacy-handoff", clientCrmProvider: "ACTIVECAMPAIGN" })];
  const recordsResponse = await recordsRoute.GET(request("/api/client-crm/records"));
  assert.deepEqual((await recordsResponse.json()).records.map((item) => item.id), ["record"]);
  const handoffsResponse = await handoffRoute.GET(request("/api/handoffs"));
  assert.deepEqual((await handoffsResponse.json()).handoffs.map((item) => item.id), ["handoff"]);
  assert.equal(state.records.length, 2); assert.equal(state.handoffs.length, 2);
  assert.deepEqual(state.writes, []); assert.deepEqual(state.providers, []);
});
test("current sync and new-handoff APIs cannot choose legacy ActiveCampaign", async () => {
  state.connections.push(connection("legacy", "ACTIVECAMPAIGN")); state.deals = [deal()];
  assert.equal((await syncRoute.POST(request("/api/client-crm/sync", { provider: "ACTIVECAMPAIGN" }))).status, 422);
  assert.equal((await handoffRoute.POST(request("/api/handoffs", { agencyDealId: "deal", clientCrmProvider: "ACTIVECAMPAIGN" }))).status, 422);
  assert.deepEqual(state.writes, []); assert.deepEqual(state.providers, []);
});
test("current default sync and new handoff use Zoho when legacy also exists", async () => {
  state.connections.push(connection("legacy", "ACTIVECAMPAIGN")); state.deals = [deal()];
  assert.equal((await syncRoute.POST(request("/api/client-crm/sync", {}))).status, 200);
  const response = await handoffRoute.POST(request("/api/handoffs", { agencyDealId: "deal" }));
  assert.equal(response.status, 201); assert.equal((await response.json()).handoff.clientCrmProvider, "ZOHO");
  assert.deepEqual(state.providers.map((item) => item.kind), ["ZOHO_IMPORT", "ZOHO_HANDOFF"]);
});

test("Zoho write requires per-record success and confirmed matching ID", async () => {
  state.fetchResponse = () => Response.json({ data: [{ status: "success", code: "SUCCESS", details: { id: "12345" } }] });
  assert.equal((await zoho.createOrUpdateZohoRecord(connection(), "CONTACT", {}, "12345")).externalId, "12345");
});
for (const payload of [{ data: [{ status: "error", code: "INVALID_DATA", details: {} }] }, { data: [{ status: "success", code: "SUCCESS", details: {} }] }, { data: [{ status: "success", code: "SUCCESS", details: { id: "different" } }] }]) test("Zoho HTTP success cannot disguise record failure: " + JSON.stringify(payload), async () => {
  state.fetchResponse = () => Response.json(payload, { status: 207 });
  await assert.rejects(zoho.createOrUpdateZohoRecord(connection(), "CONTACT", {}, "12345"), { code: "EXTERNAL_SERVICE_ERROR" });
});
test("live Zoho empty result remains empty; failure never imports fixtures", async () => {
  state.fetchResponse = () => new Response(null, { status: 204 });
  assert.deepEqual(await zoho.fetchZohoRecords(connection()), []);
  state.fetchResponse = () => Response.json({ error: "unauthorized" }, { status: 401 });
  await assert.rejects(zoho.fetchZohoRecords(connection()), { code: "EXTERNAL_SERVICE_ERROR" });
});
test("live Zoho malformed IDs fail instead of creating mappings", async () => {
  state.fetchResponse = () => Response.json({ data: [{ First_Name: "No ID" }] });
  await assert.rejects(zoho.fetchZohoRecords(connection()), { code: "EXTERNAL_SERVICE_ERROR" });
});
test("explicit Zoho mock credentials still provide offline fixtures", async () => {
  state.token = "mock-fixture"; assert.ok((await zoho.fetchZohoRecords(connection())).length > 0); assert.deepEqual(state.http, []);
});
test("Zoho note rejection does not report a completely successful handoff", async () => {
  state.fetchResponse = (url) => Response.json({ data: [String(url).includes("/Notes")
    ? { status: "error", code: "INVALID_DATA", details: {} }
    : { status: "success", code: "SUCCESS", details: { id: "12345" } }] });
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await assert.rejects(zoho.syncHandoffToZoho(connection(), {
      agencyDealId: "deal", clientAccountId: "a", dealName: "Sale", amountCents: 10000,
      currency: "USD", closeStatus: "CLOSED_WON", closeDate: now.toISOString(),
    }), { code: "EXTERNAL_SERVICE_ERROR" });
  } finally { console.warn = originalWarn; }
});
test("legacy live errors are not masked by test-mode fixtures or invented IDs", async () => {
  state.fetchResponse = () => Response.json({}, { status: 500 });
  await assert.rejects(legacy.fetchActiveCampaignRecords(connection("legacy", "ACTIVECAMPAIGN")), { code: "EXTERNAL_SERVICE_ERROR" });
  state.fetchResponse = () => Response.json({ contact: {} });
  await assert.rejects(legacy.createOrUpdateActiveCampaignRecord(connection("legacy", "ACTIVECAMPAIGN"), "CONTACT", {}, "12345"), { code: "EXTERNAL_SERVICE_ERROR" });
});
test("legacy live empty import remains empty", async () => {
  state.fetchResponse = () => new Response(null, { status: 204 });
  assert.deepEqual(await legacy.fetchActiveCampaignRecords(connection("legacy", "ACTIVECAMPAIGN")), []);
});
