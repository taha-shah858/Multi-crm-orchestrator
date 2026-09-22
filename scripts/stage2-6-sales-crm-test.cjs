const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the Stage 2.6 test.");
process.env.INTEGRATION_ENCRYPTION_KEY ||= Buffer.alloc(32, 7).toString("base64");
process.env.HUBSPOT_CLIENT_ID ||= "stage-2.6-client";
process.env.HUBSPOT_CLIENT_SECRET ||= "stage-2.6-secret";
process.env.HUBSPOT_REDIRECT_URI ||= "http://localhost:3000/api/integrations/hubspot/callback";
process.env.NODE_ENV = "test";

const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
Module._load = function loadServerBoundary(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
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

const { prisma } = require(path.join(root, "src", "lib", "db", "prisma.ts"));
const { syncActiveClientContacts } = require(path.join(root, "src", "lib", "sync", "contact-sync-service.ts"));
const { updateActiveClientCompany, updateActiveClientDeal } = require(path.join(root, "src", "lib", "sync", "sales-crm-service.ts"));
const { runIntegrationSync } = require(path.join(root, "src", "lib", "integrations", "integration-service.ts"));
const { encryptIntegrationSecret, decryptIntegrationSecret } = require(path.join(root, "src", "lib", "integrations", "credential-crypto.ts"));
const { listInteractions } = require(path.join(root, "src", "lib", "interactions", "interaction-service.ts"));
const { normalizeRichTextToPlainText } = require(path.join(root, "src", "lib", "text", "plain-text.ts"));
const verifyPersistedMode = process.argv[2] === "--verify-persisted";
const marker = process.argv[3] || `stage26-${Date.now()}`;
const ids = { organization: `${marker}-org`, user: `${marker}-user`, client: `${marker}-client`, otherClient: `${marker}-other`, connection: `${marker}-connection` };
const calls = [];
let failCompanyPatch = false;
let refreshRequestSeen = false;

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const record = (id, properties, associations = {}) => ({ id, properties, associations: Object.fromEntries(Object.entries(associations).map(([name, values]) => [name, { results: values.map((value) => ({ id: value })) }])), createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-20T10:00:00.000Z", archived: false });

global.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.pathname === "/oauth/2026-03/token") {
    const form = new URLSearchParams(init.body);
    assert(form.get("grant_type") === "refresh_token" && form.get("refresh_token") === "stage-2.6-refresh-token", "Expired OAuth access token did not use the persisted refresh token.");
    refreshRequestSeen = true;
    return response({ access_token: "stage-2.6-refreshed-access-token", refresh_token: "stage-2.6-rotated-refresh-token", expires_in: 1800, hub_id: 247075021, scopes: ["crm.objects.contacts.read", "sales-email-read"] });
  }
  const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
  calls.push({ method: init.method || "GET", path: url.pathname, body });
  if (init.method === "PATCH") {
    if (failCompanyPatch && url.pathname.includes("/companies/")) return response({ message: "fixture provider failure" }, 503);
    return response(record(url.pathname.split("/").pop(), JSON.parse(init.body).properties));
  }
  if (url.pathname === "/crm/v3/owners") return response({ results: [{ id: "owner-1", email: "owner@example.test", firstName: "Morgan", lastName: "Lee", userId: 91, teams: [{ id: "team-1" }], archived: false }] });
  if (url.pathname === "/crm/v3/pipelines/deals") return response({ results: [{ id: "pipeline-1", label: "Enterprise Sales", displayOrder: 0, stages: [{ id: "stage-open", label: "Qualified", displayOrder: 0, metadata: { probability: "0.5", isClosed: "false" } }, { id: "stage-won", label: "Closed won", displayOrder: 1, metadata: { probability: "1.0", isClosed: "true" } }] }] });
  if (url.pathname === "/crm/v3/objects/contacts") {
    if (!url.searchParams.has("after")) return response({ results: [record("contact-1", { firstname: "Ada", lastname: "Lovelace", email: "ada@example.test", phone: "+10000000001", company: "Analytical Engines", hubspot_owner_id: "owner-1" }, { companies: ["company-1"], deals: ["deal-1"] })], paging: { next: { after: "page-2" } } });
    return response({ results: [record("contact-2", { firstname: "Grace", lastname: "Hopper", email: "grace@example.test", phone: "+10000000002", company: "Analytical Engines", hubspot_owner_id: "owner-1" }, { companies: ["company-1"], deals: ["deal-1"] })] });
  }
  if (url.pathname === "/crm/v3/objects/companies") return response({ results: [record("company-1", { name: "Analytical Engines", domain: "analytical.example", website: "https://analytical.example", phone: "+10000000000", industry: "TECHNOLOGY", city: "London", country: "UK", address: "1 Computing Way", hubspot_owner_id: "owner-1" }, { contacts: ["contact-1", "contact-2"], deals: ["deal-1"] })] });
  if (url.pathname === "/crm/v3/objects/deals") return response({ results: [record("deal-1", { dealname: "Enterprise platform", amount: "12500.50", hs_currency_code: "USD", pipeline: "pipeline-1", dealstage: "stage-open", closedate: "2026-10-30T00:00:00.000Z", hubspot_owner_id: "owner-1", hs_is_closed: "false", hs_is_closed_won: "false" }, { contacts: ["contact-1", "contact-2"], companies: ["company-1"] })] });
  const activityMatch = url.pathname.match(/^\/crm\/v3\/objects\/(calls|meetings|notes|tasks|emails)$/);
  if (activityMatch) {
    const type = activityMatch[1];
    const activityProperties = {
      calls: { hs_timestamp: "2026-09-20T09:00:00.000Z", hs_call_title: "Discovery call", hs_call_body: "Discussed requirements", hs_call_direction: "OUTBOUND" },
      meetings: { hs_timestamp: "2026-09-20T10:00:00.000Z", hs_meeting_title: "Demo", hs_meeting_body: "Product walkthrough" },
      notes: { hs_timestamp: "2026-09-20T11:00:00.000Z", hs_note_body: '<div data-test="note"><p>Discussed CRM rollout &amp; next steps.</p><p>Owner: <strong>Ada</strong></p><script>alert("unsafe")</script></div>' },
      tasks: { hs_timestamp: "2026-09-20T12:00:00.000Z", hs_task_subject: "Send proposal", hs_task_body: "Due this week", hs_task_status: "NOT_STARTED" },
      emails: { hs_timestamp: "2026-09-20T13:00:00.000Z", hs_email_subject: "Proposal", hs_email_text: "Attached proposal", hs_email_direction: "OUTGOING_EMAIL" },
    }[type];
    return response({ results: [record(`${type}-1`, activityProperties, { contacts: ["contact-1"], companies: ["company-1"], deals: ["deal-1"] })] });
  }
  return response({ message: `Unexpected fixture URL ${url.pathname}` }, 404);
};

async function main() {
  if (verifyPersistedMode) {
    const persisted = await prisma.integrationConnection.findFirst({ where: { id: ids.connection, organizationId: ids.organization, clientAccountId: ids.client }, include: { credential: true } });
    assert(persisted?.credential?.encryptedRefreshToken, "OAuth connection or refresh credential did not persist across the fresh process.");
    const persistedContext = { user: { id: ids.user, organizationId: ids.organization, name: "Stage 2.6 Agent", email: `${marker}@example.test`, role: "AGENT" }, activeClientAccountId: ids.client };
    const result = await syncActiveClientContacts(persistedContext, `${marker}-fresh-process`);
    assert(result.runs[0]?.status === "COMPLETED" && result.recordsCreated === 0, "Fresh process could not resolve and reuse the persisted active-client connection.");
    console.log(JSON.stringify({ stage: "2.6", mode: "fresh-process-persistence", marker, status: "passed" }));
    return;
  }

  await prisma.organization.create({ data: { id: ids.organization, name: `Stage 2.6 ${marker}`, users: { create: { id: ids.user, email: `${marker}@example.test`, name: "Stage 2.6 Agent", role: "AGENT", status: "ACTIVE" } }, clients: { createMany: { data: [{ id: ids.client, name: "Fixture Client", brandName: "Fixture" }, { id: ids.otherClient, name: "Other Client", brandName: "Other" }] } } } });
  await prisma.clientAssignment.createMany({ data: [{ userId: ids.user, clientAccountId: ids.client }, { userId: ids.user, clientAccountId: ids.otherClient }] });
  await prisma.integrationConnection.create({ data: { id: ids.connection, organizationId: ids.organization, ownershipType: "CLIENT_ACCOUNT", ownershipKey: `client:${ids.client}`, clientAccountId: ids.client, provider: "HUBSPOT", providerAccountId: "247075021", status: "DEGRADED", scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.companies.read", "crm.objects.companies.write", "crm.objects.deals.read", "crm.objects.deals.write", "crm.objects.owners.read", "sales-email-read"], credential: { create: { encryptedAccessToken: encryptIntegrationSecret("stage-2.6-expired-access-token"), encryptedRefreshToken: encryptIntegrationSecret("stage-2.6-refresh-token"), accessTokenExpiresAt: new Date(Date.now() - 60_000) } } } });
  const context = { user: { id: ids.user, organizationId: ids.organization, name: "Stage 2.6 Agent", email: `${marker}@example.test`, role: "AGENT" }, activeClientAccountId: ids.client };

  const first = await syncActiveClientContacts(context, `${marker}-first`);
  assert(first.runs[0].status === "COMPLETED" && first.recordsFailed === 0, "First fixture sync did not complete.");
  assert(refreshRequestSeen, "Stored OAuth refresh token was not used for an expired access token.");
  const refreshedCredential = await prisma.integrationCredential.findUnique({ where: { integrationConnectionId: ids.connection } });
  assert(refreshedCredential && decryptIntegrationSecret(refreshedCredential.encryptedAccessToken) === "stage-2.6-refreshed-access-token" && decryptIntegrationSecret(refreshedCredential.encryptedRefreshToken) === "stage-2.6-rotated-refresh-token", "Refreshed OAuth credentials were not persisted.");

  const noteAfterImport = await prisma.interaction.findFirst({ where: { clientAccountId: ids.client, type: "NOTE", source: "HUBSPOT" } });
  assert(noteAfterImport?.body === "Discussed CRM rollout & next steps.\nOwner: Ada", "HubSpot note rich text was not normalized during import.");
  assert(normalizeRichTextToPlainText('<div>Hello&nbsp;<b>world</b><br>Next</div><style>.hidden{}</style>') === "Hello world\nNext", "Rich-text normalizer did not produce safe readable text.");
  await prisma.interaction.update({ where: { id: noteAfterImport.id }, data: { body: "<p>Previously imported &amp; unsanitized</p>" } });
  const presentedNote = (await listInteractions(context)).find((item) => item.id === noteAfterImport.id);
  assert(presentedNote?.body === "Previously imported & unsanitized", "Existing HubSpot rich text was not normalized before presentation.");

  await prisma.integrationConnection.update({ where: { id: ids.connection }, data: { status: "DEGRADED", lastError: "Fixture partial failure" } });
  const second = await runIntegrationSync(context.user, ids.connection, `${marker}-second`, ids.client);
  assert(second.recordsCreated === 0, "Repeated sync created duplicate canonical records.");
  await prisma.integrationConnection.update({ where: { id: ids.connection }, data: { status: "DEGRADED", lastError: "Fixture restart check" } });
  const freshProcess = spawnSync(process.execPath, [__filename, "--verify-persisted", marker], { cwd: root, env: process.env, encoding: "utf8" });
  assert(freshProcess.status === 0, `Fresh-process connection persistence regression failed: ${freshProcess.stderr || freshProcess.stdout}`);

  const [contacts, companies, owners, deals, interactions, mappings] = await Promise.all([
    prisma.contact.findMany({ where: { clientAccountId: ids.client } }),
    prisma.crmCompany.findMany({ where: { clientAccountId: ids.client } }),
    prisma.crmOwner.findMany({ where: { clientAccountId: ids.client } }),
    prisma.deal.findMany({ where: { clientAccountId: ids.client }, include: { contactLinks: true } }),
    prisma.interaction.findMany({ where: { clientAccountId: ids.client, source: "HUBSPOT" }, include: { contactLinks: true, companyLinks: true, dealLinks: true } }),
    prisma.externalRecord.findMany({ where: { connectionId: ids.connection } }),
  ]);
  assert(contacts.length === 2 && companies.length === 1 && owners.length === 1 && deals.length === 1 && interactions.length === 5, "Canonical sales CRM object counts were incorrect.");
  assert(mappings.length === 10 && new Set(mappings.map((item) => `${item.objectType}:${item.externalId}`)).size === 10, "Provider mappings were missing or duplicated.");
  assert(deals[0].contactLinks.length === 2 && deals[0].companyId === companies[0].id && deals[0].crmOwnerId === owners[0].id, "Deal associations were not preserved.");
  assert(interactions.every((item) => item.contactLinks.length === 1 && item.companyLinks.length === 1 && item.dealLinks.length === 1), "Activity associations were not preserved.");

  const companyUpdate = await updateActiveClientCompany(context, companies[0].id, { phone: "+19999999999" }, `${marker}-company`);
  assert(companyUpdate.outboundSync.status === "COMPLETED", "Company outbound update did not complete.");
  const dealUpdate = await updateActiveClientDeal(context, deals[0].id, { amount: 13000, title: "Enterprise platform renewal" }, `${marker}-deal`);
  assert(dealUpdate.outboundSync.status === "COMPLETED", "Deal outbound update did not complete.");
  assert(calls.some((item) => item.method === "PATCH" && item.path.includes("/companies/company-1")) && calls.some((item) => item.method === "PATCH" && item.path.includes("/deals/deal-1")), "Supported outbound writes did not reach the mapped provider IDs.");

  failCompanyPatch = true;
  const failed = await updateActiveClientCompany(context, companies[0].id, { industry: "SOFTWARE" }, `${marker}-company-failure`);
  assert(failed.outboundSync.status === "FAILED", "Provider failure did not produce a retryable outbound result.");
  assert((await prisma.crmCompany.findUnique({ where: { id: companies[0].id } })).industry === "SOFTWARE", "Provider failure rolled back the local-first company edit.");
  failCompanyPatch = false;
  const retried = await updateActiveClientCompany(context, companies[0].id, {}, `${marker}-company-retry`);
  assert(retried.outboundSync.status === "COMPLETED", "Company retry did not complete without re-entering credentials.");

  let isolated = false;
  try { await updateActiveClientCompany({ ...context, activeClientAccountId: ids.otherClient }, companies[0].id, { name: "Leak" }, `${marker}-isolation`); }
  catch (error) { isolated = error?.code === "COMPANY_NOT_FOUND"; }
  assert(isolated, "Cross-client company access was not rejected.");
  let connectionIsolated = false;
  try { await runIntegrationSync(context.user, ids.connection, `${marker}-connection-isolation`, ids.otherClient); }
  catch (error) { connectionIsolated = error?.code === "CLIENT_ACCESS_DENIED"; }
  assert(connectionIsolated, "Cross-client connection resolution was not rejected.");
  console.log(JSON.stringify({ stage: "2.6", marker, status: "passed", counts: { contacts: 2, companies: 1, owners: 1, deals: 1, activities: 5, mappings: 10 } }));
}

main().finally(async () => {
  if (!verifyPersistedMode) await prisma.organization.deleteMany({ where: { id: ids.organization } });
  await prisma.$disconnect();
}).catch((error) => { console.error(error); process.exitCode = 1; });
