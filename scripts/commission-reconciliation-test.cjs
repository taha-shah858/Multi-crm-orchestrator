// Integration tests against disposable organizations. No live CRM or payment provider calls.
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
const { updateCommission, listSalesOperations, createManualCommission } = require("../src/lib/operations/sales-operations-service.ts");
const { listAgentSales, syncDealToClickUp } = require("../src/lib/agent-crm/agent-sales-service.ts");
const { getAdminDashboard } = require("../src/lib/admin/admin-service.ts");
const { getCommissionReport, commissionReportCsv } = require("../src/lib/operations/commission-report-service.ts");
const { csvCell } = require("../src/lib/operations/reconciliation.ts");
const agentExport = require("../src/app/api/commissions/export/route.ts");
const adminExport = require("../src/app/api/admin/commissions/export/route.ts");
const commissionApi = require("../src/app/api/commissions/route.ts");
const marker = `reconciliation-${Date.now()}`;
const ids = { org: marker, foreignOrg: `${marker}-foreign`, client: `${marker}-client`, denied: `${marker}-denied`, agent: `${marker}-agent`, other: `${marker}-other`, admin: `${marker}-admin` };
const user = { id: ids.agent, organizationId: ids.org, name: "Test Agent", email: `${marker}@example.test`, role: "AGENT" };
const admin = { ...user, id: ids.admin, role: "ADMIN" };
const context = { user, activeClientAccountId: ids.client };
const jan = { from: "2026-01-01", to: "2026-01-31" };
let checks = 0;
function passed(name) { checks++; console.log(`PASS ${name}`); }
async function session(userId) {
  const token = randomUUID();
  await prisma.authSession.create({ data: { userId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
  return token;
}
function request(query, token, client = ids.client) {
  return new NextRequest(`http://localhost/api/commissions/export?${query}`, { headers: token ? { cookie: `multi_crm_session=${token}; multi_crm_active_client=${client}` } : {} });
}
async function main() {
  try {
    await prisma.organization.create({ data: { id: ids.org, name: marker, users: { create: [
      { id: ids.agent, name: user.name, email: user.email, role: "AGENT", status: "ACTIVE" },
      { id: ids.other, name: "Other Agent", email: `${marker}-other@example.test`, role: "AGENT", status: "ACTIVE" },
      { id: ids.admin, name: "Admin", email: `${marker}-admin@example.test`, role: "ADMIN", status: "ACTIVE" },
    ] }, clients: { create: [{ id: ids.client, name: "Report client", brandName: "Reports" }, { id: ids.denied, name: "Denied", brandName: "Denied" }] } } });
    await prisma.organization.create({ data: { id: ids.foreignOrg, name: "Foreign" } });
    await prisma.clientAssignment.createMany({ data: [{ userId: ids.agent, clientAccountId: ids.client }, { userId: ids.other, clientAccountId: ids.client }] });
    const commission = await createManualCommission(context, { dealTitle: "Corrected sale", dealValue: 1000, expectedCommission: 100, receivedCommission: 0 }, marker);
    await prisma.deal.update({ where: { id: commission.dealId }, data: { closedAt: new Date("2026-03-01T00:00:00Z") } });

    await Promise.all(Array.from({ length: 12 }, () => updateCommission(context, commission.id, { action: "LEDGER", type: "PAYMENT", amount: 1, note: "Concurrent payment" }, marker)));
    let saved = await prisma.commissionRecord.findUniqueOrThrow({ where: { id: commission.id }, include: { ledgerEntries: true } });
    assert.equal(saved.receivedCents, 1200);
    assert.equal(saved.ledgerEntries.filter(entry => entry.type === "PAYMENT").length, 12);
    passed("12 concurrent payments are all counted");

    await Promise.all(Array.from({ length: 12 }, (_, index) => updateCommission(context, commission.id, { action: "LEDGER", type: index % 2 ? "PAYMENT" : "ADJUSTMENT", amount: index % 2 ? 2 : -1, note: "Concurrent correction" }, marker)));
    saved = await prisma.commissionRecord.findUniqueOrThrow({ where: { id: commission.id } });
    assert.equal(saved.expectedCents, 9400);
    assert.equal(saved.receivedCents, 2400);
    passed("Concurrent payments and expected adjustments preserve both balances");

    await updateCommission(context, commission.id, { expectedCommission: 80, receivedCommission: 20, notes: "Reviewed totals" }, marker);
    saved = await prisma.commissionRecord.findUniqueOrThrow({ where: { id: commission.id }, include: { ledgerEntries: true } });
    assert.equal(saved.ledgerEntries.filter(entry => entry.type !== "PAYMENT").reduce((sum, entry) => sum + entry.amountCents, 0), 8000);
    assert.equal(saved.ledgerEntries.filter(entry => entry.type === "PAYMENT").reduce((sum, entry) => sum + entry.amountCents, 0), 2000);
    assert.equal((await listAgentSales(user)).sales.find(sale => sale.id === commission.dealId).expectedRevenueCents, 8000);
    await syncDealToClickUp(commission.dealId, ids.agent);
    assert.equal((await prisma.agentClickUpRecord.findUniqueOrThrow({ where: { agentId_dealId: { agentId: ids.agent, dealId: commission.dealId } } })).commissionCents, 8000);
    passed("Manual total corrections remain journaled and match closed-sales and ClickUp projections");

    const ledgerBefore = saved.ledgerEntries.length;
    await assert.rejects(updateCommission(context, commission.id, { action: "LEDGER", type: "ADJUSTMENT", amount: -1000, note: "Too much" }, marker));
    await assert.rejects(updateCommission(context, commission.id, { action: "LEDGER", type: "PAYMENT", amount: 1e20, note: "Overflow" }, marker));
    assert.equal(await prisma.commissionLedgerEntry.count({ where: { commissionId: commission.id } }), ledgerBefore);
    assert.equal((await prisma.commissionRecord.findUniqueOrThrow({ where: { id: commission.id } })).expectedCents, 8000);
    passed("Rejected adjustments and overflowing amounts leave balances and history unchanged");

    await prisma.commissionRecord.createMany({ data: Array.from({ length: 125 }, (_, index) => ({ organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, expectedCents: 100, receivedCents: 0, currency: "USD", createdAt: new Date(index === 124 ? "2026-01-31T23:59:59.999Z" : "2026-01-01T00:00:00Z") })) });
    await prisma.commissionRecord.createMany({ data: [
      { organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, expectedCents: 3000, receivedCents: 1000, currency: "EUR", createdAt: new Date("2026-01-15T12:00:00Z") },
      { organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, expectedCents: 100, receivedCents: 200, currency: "USD", createdAt: new Date("2026-01-15T12:00:00Z") },
      { organizationId: ids.org, clientAccountId: ids.client, userId: ids.other, expectedCents: 999, receivedCents: 0, currency: "USD", createdAt: new Date("2026-01-15T12:00:00Z") },
      { organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, expectedCents: 999999, receivedCents: 0, currency: "USD", createdAt: new Date("2026-02-01T00:00:00Z") },
    ] });
    await prisma.timeLog.createMany({ data: Array.from({ length: 125 }, () => ({ organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, minutes: 1, description: "January time", loggedAt: new Date("2026-01-15T12:00:00Z") })) });
    const view = await listSalesOperations(context, jan);
    assert.equal(view.commissions.length, 100);
    assert.equal(view.summary.recordCount, 127);
    assert.equal(view.summary.activeMinutes, 125);
    assert.equal(view.summary.currencyTotals.find(total => total.currency === "USD").expectedCents, 12600);
    assert.equal(view.summary.currencyTotals.find(total => total.currency === "USD").pendingCents, 12500);
    assert.equal(view.summary.currencyTotals.find(total => total.currency === "EUR").expectedCents, 3000);
    assert.equal(view.summary.expectedCents, 0); // No fabricated cross-currency sum.
    passed("Complete-period currency totals and time totals include more than 100 records; overpayments do not hide unpaid deals");

    const report = await getCommissionReport(user, ids.client, jan);
    assert.equal(report.records.length, 127);
    assert.deepEqual(report.summary.currencyTotals, view.summary.currencyTotals);
    const dashboard = await getAdminDashboard(admin, jan);
    assert.equal(dashboard.summary.recordCount, 128);
    assert.equal(dashboard.summary.activeMinutes, 125);
    assert.equal((await getAdminDashboard({ ...admin, organizationId: ids.foreignOrg }, jan)).summary.recordCount, 0);
    passed("Exports contain the entire period, while agent and admin reports maintain their access scopes");

    const formula = await prisma.commissionRecord.create({ data: { organizationId: ids.org, clientAccountId: ids.client, userId: ids.agent, expectedCents: 1, currency: "USD", notes: '=HYPERLINK("example.test")', createdAt: new Date("2026-01-15T12:00:00Z") } });
    const csv = commissionReportCsv(await getCommissionReport(user, ids.client, jan));
    assert.ok(csv.includes("'\u003dHYPERLINK"));
    assert.equal(csvCell("\t@SUM(1,2)"), '"\'\t@SUM(1,2)"');
    assert.equal(csvCell(-10), '"-10"');
    assert.ok(csv.includes('"Currency"'));
    assert.ok(csv.includes('"USD","127"'));
    await prisma.commissionRecord.delete({ where: { id: formula.id } });
    passed("CSV includes currency totals and safely quotes spreadsheet formulas and text");

    const agentToken = await session(ids.agent), adminToken = await session(ids.admin);
    const route = await agentExport.GET(request("from=2026-01-01&to=2026-01-31", agentToken));
    assert.equal(route.status, 200);
    assert.match(route.headers.get("content-type"), /text\/csv/);
    assert.equal(route.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(Buffer.from(await route.arrayBuffer()), Buffer.from(commissionReportCsv(report), "utf8"));
    assert.equal((await adminExport.GET(request("", agentToken))).status, 403);
    assert.equal((await agentExport.GET(request("", agentToken, ids.denied))).status, 403);
    assert.equal((await agentExport.GET(request("", undefined))).status, 401);
    assert.equal((await adminExport.GET(request("from=2026-01-01&to=2026-01-31", adminToken))).status, 200);
    passed("Export routes require sessions and enforce agent, client, and admin authorization");

    for (const invalid of ["from=2026-02-31", "from=2026-02-01&to=2026-01-01", "currency=INVALID"]) {
      assert.equal((await agentExport.GET(request(invalid, agentToken))).status, 422);
      assert.equal((await commissionApi.GET(request(invalid, agentToken))).status, 422);
    }
    passed("List and export routes consistently reject invalid or reversed dates and invalid currencies");
    console.log(`${checks} reconciliation integration checks passed.`);
  } finally {
    await prisma.organization.deleteMany({ where: { id: { in: [ids.org, ids.foreignOrg] } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
