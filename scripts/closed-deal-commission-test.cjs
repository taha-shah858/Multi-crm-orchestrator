// Database integration coverage. Uses only a disposable organization and no live providers.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env.local"), quiet: true });
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
process.env.NODE_ENV = "test";
console.info = () => {}; // Keep provider audit chatter out of the test report.
const resolve = Module._resolveFilename;
const load = Module._load;
Module._resolveFilename = function(request, parent, isMain, options) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, parent, isMain, options);
};
Module._load = function(request, parent, isMain) {
  if (request === "server-only") return {};
  return load.call(this, request, parent, isMain);
};
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);

const { prisma } = require("../src/lib/db/prisma.ts");
const { ensureClosedDealCommission } = require("../src/lib/operations/closed-deal-commission.ts");
const { updateAgencyDeal, createAgencyDeal } = require("../src/lib/sync/sales-crm-service.ts");
const { createDealHandoffFromAgencyDeal, dispatchHandoffToClientCrm } = require("../src/lib/handoff/handoff-service.ts");
const { listSalesOperations, updateCommission, createManualCommission } = require("../src/lib/operations/sales-operations-service.ts");
const { getAdminDashboard } = require("../src/lib/admin/admin-service.ts");
const marker = `commission-test-${Date.now()}`;
const ids = { org: `${marker}-org`, otherOrg: `${marker}-other-org`, agent: `${marker}-agent`, otherAgent: `${marker}-other-agent`, admin: `${marker}-admin`, client: `${marker}-client`, denied: `${marker}-denied`, foreign: `${marker}-foreign` };
const user = { id: ids.agent, organizationId: ids.org, name: "Commission Agent", email: `${marker}@example.test`, role: "AGENT" };
const context = { user, activeClientAccountId: ids.client };
const admin = { ...user, id: ids.admin, role: "ADMIN" };
const adminContext = { user: admin, activeClientAccountId: ids.client };
let checks = 0;
function passed(name) { checks++; console.log(`PASS ${name}`); }
async function deal(data = {}) {
  return prisma.deal.create({ data: { organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, title: "Commission test deal", valueCents: 100000, currency: "USD", status: "OPEN", ...data } });
}
async function record(dealId) {
  return prisma.commissionRecord.findUniqueOrThrow({ where: { dealId }, include: { ledgerEntries: true } });
}

async function main() {
  try {
    await prisma.organization.create({ data: { id: ids.org, name: marker,
      users: { create: [
        { id: ids.agent, name: user.name, email: user.email, role: "AGENT", defaultCommissionRate: 15 },
        { id: ids.otherAgent, name: "Other Agent", email: `${marker}-other@example.test`, role: "AGENT" },
        { id: ids.admin, name: "Admin", email: `${marker}-admin@example.test`, role: "ADMIN" },
      ] }, clients: { create: [
        { id: ids.client, name: "Commission client", brandName: "Test", defaultCommissionRate: 12 },
        { id: ids.denied, name: "Unassigned client", brandName: "Denied" },
      ] },
    } });
    await prisma.organization.create({ data: { id: ids.otherOrg, name: `${marker}-other`, clients: { create: { id: ids.foreign, name: "Foreign client", brandName: "Foreign" } } } });
    await prisma.clientAssignment.create({ data: { userId: ids.agent, clientAccountId: ids.client } });
    await prisma.clientAssignment.create({ data: { userId: ids.otherAgent, clientAccountId: ids.client } });

    const won = await deal();
    const result = await updateAgencyDeal(context, won.id, { status: "CLOSED_WON" }, marker);
    let commission = await record(won.id);
    assert.equal(result.deal.commissionRate, 15);
    assert.equal(commission.expectedCents, 15000);
    assert.equal(commission.source, "CRM");
    assert.equal(commission.userId, ids.agent);
    assert.equal(commission.clientAccountId, ids.client);
    assert.equal(commission.ledgerEntries.length, 1);
    assert.equal(commission.ledgerEntries[0].type, "EXPECTED");
    assert.equal(commission.ledgerEntries[0].amountCents, 15000);
    assert.equal(result.handoff.status, "FAILED"); // no Zoho connection in this fixture
    passed("Closing a CRM deal records commission even when Zoho is unavailable");

    await updateCommission(context, commission.id, { action: "LEDGER", type: "PAYMENT", amount: "50", note: "Partial payout" }, marker);
    await updateCommission(context, commission.id, { action: "LEDGER", type: "ADJUSTMENT", amount: "-10", note: "Approved correction" }, marker);
    commission = await record(won.id);
    const snapshot = JSON.stringify(commission);
    await updateAgencyDeal(adminContext, won.id, { status: "CLOSED_WON" }, marker);
    await dispatchHandoffToClientCrm(adminContext, result.handoff.id);
    assert.equal(JSON.stringify(await record(won.id)), snapshot);
    assert.equal(commission.status, "PARTIALLY_PAID");
    passed("Admin re-closing and handoff retry preserve agent attribution, payments, adjustments, and timestamps");

    const concurrent = await deal();
    await Promise.all(Array.from({ length: 12 }, () => updateAgencyDeal(context, concurrent.id, { status: "CLOSED_WON" }, marker)));
    assert.equal(await prisma.commissionRecord.count({ where: { dealId: concurrent.id } }), 1);
    assert.equal((await record(concurrent.id)).ledgerEntries.length, 1);
    assert.equal(await prisma.auditLog.count({ where: { entityId: (await record(concurrent.id)).id, action: "COMMISSION_CREATED" } }), 1);
    passed("Concurrent closures create exactly one commission, EXPECTED ledger entry, and audit event");

    const zero = await deal({ commissionRate: 0 });
    await createDealHandoffFromAgencyDeal(context, zero.id);
    assert.equal((await record(zero.id)).expectedCents, 0);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: zero.id } })).commissionRate, 0);
    passed("Explicit zero commission rate is preserved");

    const fixed = await deal({ commissionRate: 7, currency: "EUR" });
    await updateAgencyDeal(adminContext, fixed.id, { stageLabel: "Closed Won" }, marker);
    assert.equal((await record(fixed.id)).expectedCents, 7000);
    assert.equal((await record(fixed.id)).currency, "EUR");
    assert.equal((await record(fixed.id)).userId, ids.agent);
    passed("Deal rate overrides defaults, preserves currency, and credits the assigned agent when admin closes");

    await prisma.user.update({ where: { id: ids.agent }, data: { defaultCommissionRate: null } });
    const clientRate = await deal();
    await updateAgencyDeal(context, clientRate.id, { status: "CLOSED_WON" }, marker);
    assert.equal((await record(clientRate.id)).expectedCents, 12000);
    await prisma.clientAccount.update({ where: { id: ids.client }, data: { defaultCommissionRate: null } });
    const defaultRate = await deal({ userId: null });
    await updateAgencyDeal(context, defaultRate.id, { status: "CLOSED_WON" }, marker);
    assert.equal((await record(defaultRate.id)).expectedCents, 10000);
    assert.equal((await record(defaultRate.id)).userId, ids.agent);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: defaultRate.id } })).userId, ids.agent);
    passed("Client and agency rate fallbacks work; unassigned deal is attributed to the closing user");

    const invalid = await deal({ commissionRate: 101 });
    await assert.rejects(updateAgencyDeal(context, invalid.id, { status: "CLOSED_WON" }, marker), (error) => error.code === "INVALID_COMMISSION_INPUT");
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: invalid.id } })).status, "OPEN");
    assert.equal(await prisma.commissionRecord.count({ where: { dealId: invalid.id } }), 0);
    passed("Invalid financial data rolls back both closure and commission");

    const forbidden = await deal({ clientAccountId: ids.denied });
    await assert.rejects(createDealHandoffFromAgencyDeal(context, forbidden.id), (error) => error.code === "CLIENT_ACCESS_DENIED");
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: forbidden.id } })).status, "OPEN");
    const foreign = await deal({ organizationId: ids.otherOrg, clientAccountId: ids.foreign, userId: null, status: "CLOSED_WON" });
    await assert.rejects(prisma.$transaction((tx) => ensureClosedDealCommission(tx, context, foreign.id)), (error) => error.code === "DEAL_NOT_FOUND");
    assert.equal(await prisma.commissionRecord.count({ where: { dealId: foreign.id } }), 0);
    passed("Actual client access and agency boundaries are enforced before financial creation");

    const created = await createAgencyDeal(context, { title: "Created already won", amount: 500, status: "CLOSED_WON", clientAccountId: ids.client }, marker);
    assert.equal((await record(created.deal.id)).expectedCents, 5000);
    passed("Creating a CRM deal already Closed Won also records its commission");

    const manual = await createManualCommission(context, { dealTitle: "Manual off-platform", dealValue: 1000, expectedCommission: 99, receivedCommission: 22, notes: "Keep manual" }, marker);
    const manualSnapshot = JSON.stringify(await record(manual.dealId));
    await createDealHandoffFromAgencyDeal(context, manual.dealId);
    assert.equal(JSON.stringify(await record(manual.dealId)), manualSnapshot);
    passed("Existing manual sales are never duplicated or converted to CRM entries");

    const ledger = await listSalesOperations(context);
    assert.ok(ledger.commissions.some((item) => item.id === commission.id && item.deal.commissionRate === 15));
    const otherLedger = await listSalesOperations({ ...context, user: { ...user, id: ids.otherAgent } });
    assert.equal(otherLedger.commissions.length, 0);
    const dashboard = await getAdminDashboard(admin);
    assert.ok(dashboard.commissions.some((item) => item.id === commission.id && item.source === "CRM" && item.user.id === ids.agent));
    passed("Agent commission ledger and admin Sales Commission read the same scoped financial record");
    console.log(`${checks} database integration checks passed.`);
  } finally {
    await prisma.organization.deleteMany({ where: { id: { in: [ids.org, ids.otherOrg] } } });
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
