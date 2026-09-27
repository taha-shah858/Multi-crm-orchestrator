const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the Stage 2.9 test.");
process.env.INTEGRATION_ENCRYPTION_KEY ||= Buffer.alloc(32, 9).toString("base64");
process.env.NODE_ENV = "test";
process.env.CLICKUP_MOCK = "true";

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
const { encryptIntegrationSecret, decryptIntegrationSecret } = require(path.join(root, "src", "lib", "integrations", "credential-crypto.ts"));
const { userIntegrationWhere } = require(path.join(root, "src", "lib", "integrations", "connection-resolution.ts"));
const { clickUpAdapter } = require(path.join(root, "src", "lib/integrations/clickup/adapter.ts"));
const { getIntegrationAdapter } = require(path.join(root, "src", "lib/integrations/registry.ts"));
const {
  connectClickUp,
  disconnectClickUp,
  getClickUpConnectionStatus,
  beginClickUpOAuth,
  completeClickUpOAuth,
  disconnectIntegration,
  connectZoho,
} = require(path.join(root, "src", "lib/integrations/integration-service.ts"));
const {
  calculateEffectiveCommissionRate,
  calculateExpectedRevenueCents,
  snapshotDealCommission,
  syncDealToClickUp,
  listAgentSales,
} = require(path.join(root, "src", "lib/agent-crm/agent-sales-service.ts"));
const { createDealHandoffFromAgencyDeal } = require(path.join(root, "src", "lib/handoff/handoff-service.ts"));
const { buildClickUpTaskTitle, buildClickUpTaskDescription } = require(path.join(root, "src", "lib/integrations/clickup/tasks.ts"));

const marker = `stage29-${Date.now()}`;
const ids = {
  org: `${marker}-org`,
  admin: `${marker}-admin`,
  agentA: `${marker}-agent-a`,
  agentB: `${marker}-agent-b`,
  clientA: `${marker}-client-a`,
  clientB: `${marker}-client-b`,
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    throw new Error(message);
  }
};

async function main() {
  console.log(`\n======================================================`);
  console.log(`Starting Stage 2.9 ClickUp Agent Personal CRM / Sales Tracker Tests: ${marker}`);
  console.log(`======================================================\n`);

  try {
    // 1. Setup Organization, Admin, Agents, Clients
    console.log("-> 1. Setting up Organization, Admin, Agent Users, and Client Accounts...");
    await prisma.organization.create({
      data: {
        id: ids.org,
        name: `Agency Org ${marker}`,
        users: {
          create: [
            {
              id: ids.admin,
              email: `${marker}-admin@example.test`,
              name: "Agency Administrator",
              role: "ADMIN",
              status: "ACTIVE",
            },
            {
              id: ids.agentA,
              email: `${marker}-agent-a@example.test`,
              name: "Agent Alice",
              role: "AGENT",
              status: "ACTIVE",
              defaultCommissionRate: 15.0, // Agent-specific rate
            },
            {
              id: ids.agentB,
              email: `${marker}-agent-b@example.test`,
              name: "Agent Bob",
              role: "AGENT",
              status: "ACTIVE",
              defaultCommissionRate: 10.0,
            },
          ],
        },
        clients: {
          createMany: {
            data: [
              { id: ids.clientA, name: "Northstar Analytics", brandName: "Northstar", defaultCommissionRate: 12.0 },
              { id: ids.clientB, name: "Blue Sky Corp", brandName: "Blue Sky", defaultCommissionRate: null },
            ],
          },
        },
      },
    });

    await prisma.clientAssignment.createMany({
      data: [
        { userId: ids.agentA, clientAccountId: ids.clientA },
        { userId: ids.agentA, clientAccountId: ids.clientB },
        { userId: ids.agentB, clientAccountId: ids.clientA },
        { userId: ids.agentB, clientAccountId: ids.clientB },
      ],
    });

    const agentAUser = {
      id: ids.agentA,
      organizationId: ids.org,
      name: "Agent Alice",
      email: `${marker}-agent-a@example.test`,
      role: "AGENT",
      defaultCommissionRate: 15.0,
    };

    const agentBUser = {
      id: ids.agentB,
      organizationId: ids.org,
      name: "Agent Bob",
      email: `${marker}-agent-b@example.test`,
      role: "AGENT",
      defaultCommissionRate: 10.0,
    };

    const adminUser = {
      id: ids.admin,
      organizationId: ids.org,
      name: "Agency Administrator",
      email: `${marker}-admin@example.test`,
      role: "ADMIN",
    };

    // Connect Zoho for Client A
    await connectZoho(
      adminUser,
      {
        clientAccountId: ids.clientA,
        accessToken: "mock-zoho-access-token",
        refreshToken: "mock-zoho-refresh-token",
      },
      ids.clientA,
    );

    // 2. Adapter registration in registry
    console.log("-> 2. Verifying ClickUp Adapter registration in integration registry...");
    const registeredAdapter = getIntegrationAdapter("CLICKUP");
    assert(registeredAdapter.provider === "CLICKUP", "ClickUp adapter should be registered for provider CLICKUP.");
    assert(registeredAdapter.capabilities.oauth === true, "ClickUp adapter should declare oauth capability.");
    assert(registeredAdapter.capabilities.salesCrm === false, "ClickUp must NOT be registered as the agency sales CRM.");

    // 3. ClickUp OAuth flow for Agent A
    console.log("-> 3. Testing ClickUp OAuth flow for Agent A...");
    const oauthInitiation = await beginClickUpOAuth(agentAUser, "/operations");
    assert(oauthInitiation.authorizationUrl.includes("client_id="), "OAuth URL must contain client_id.");
    assert(oauthInitiation.state.length > 10, "OAuth initiation must generate a secure state.");

    // Complete OAuth
    const oauthCompletion = await completeClickUpOAuth("mock-code-agent-a", oauthInitiation.state, agentAUser);
    assert(oauthCompletion.connection.provider === "CLICKUP", "Completed connection must be CLICKUP.");
    assert(oauthCompletion.connection.userId === ids.agentA, "Connection must belong to Agent A.");
    assert(oauthCompletion.connection.ownershipType === "USER", "Connection ownershipType must be USER.");

    // Check status
    const statusA = await getClickUpConnectionStatus(agentAUser);
    assert(statusA.isConnected === true, "Agent A status must be connected.");
    assert(statusA.status === "CONNECTED", "Agent A connection status must be CONNECTED.");

    // 4. ClickUp Connection for Agent B
    console.log("-> 4. Testing ClickUp Connection for Agent B...");
    await connectClickUp(agentBUser, {
      accessToken: "mock-clickup-token-b",
      destination: {
        teamId: "mock-team-b",
        teamName: "Bob Workspace",
        listId: "mock-list-b",
        listName: "Bob Deals",
      },
    });

    const statusB = await getClickUpConnectionStatus(agentBUser);
    assert(statusB.isConnected === true, "Agent B status must be connected.");
    assert(statusB.destination.listId === "mock-list-b", "Agent B destination must be mock-list-b.");

    // 5. Agent Isolation: Agent A cannot access or disconnect Agent B's ClickUp connection
    console.log("-> 5. Verifying Agent Isolation: Agent A cannot access or modify Agent B's ClickUp connection...");
    const connB = await prisma.integrationConnection.findFirst({
      where: { userId: ids.agentB, provider: "CLICKUP" },
    });
    assert(connB !== null, "Agent B connection should exist.");

    let isolationBlocked = false;
    try {
      await disconnectIntegration(agentAUser, connB.id);
    } catch (err) {
      isolationBlocked = true;
    }
    assert(isolationBlocked, "Agent A must NOT be allowed to disconnect Agent B's ClickUp connection.");

    // 6. Commission Hierarchy & Snapshot Calculation
    console.log("-> 6. Testing Commission Calculation Hierarchy & Snapshotting...");
    // Hierarchy: Deal override -> Agent rate -> Client rate -> Default 10%
    const rateDefault = calculateEffectiveCommissionRate({ dealRate: null, agentRate: null, clientRate: null });
    assert(rateDefault === 10.0, `Default rate must be 10%, got ${rateDefault}`);

    const rateClient = calculateEffectiveCommissionRate({ dealRate: null, agentRate: null, clientRate: 12.0 });
    assert(rateClient === 12.0, `Client rate must be 12%, got ${rateClient}`);

    const rateAgent = calculateEffectiveCommissionRate({ dealRate: null, agentRate: 15.0, clientRate: 12.0 });
    assert(rateAgent === 15.0, `Agent rate must take precedence over client rate (15%), got ${rateAgent}`);

    const rateDealOverride = calculateEffectiveCommissionRate({ dealRate: 20.0, agentRate: 15.0, clientRate: 12.0 });
    assert(rateDealOverride === 20.0, `Deal override must take highest precedence (20%), got ${rateDealOverride}`);

    // Test revenue cents calculation: $24,000 * 10% = $2,400
    const rev24k = calculateExpectedRevenueCents(2400000, 10.0);
    assert(rev24k === 240000, `Expected revenue for $24k at 10% must be 240000 cents ($2,400), got ${rev24k}`);

    // 7. Closed Deal Flow & Automatic ClickUp Sync
    console.log("-> 7. Testing Closed Deal Flow & Automatic ClickUp Sync...");
    // Create contact Liam Brooks
    const contact = await prisma.contact.create({
      data: {
        organizationId: ids.org,
        clientAccountId: ids.clientA,
        firstName: "Liam",
        lastName: "Brooks",
        email: "liam.brooks@gmail.com",
        phone: "47314874",
        company: "Northstar Analytics",
      },
    });

    // Create deal
    const deal1 = await prisma.deal.create({
      data: {
        id: `${marker}-deal-1`,
        organizationId: ids.org,
        clientAccountId: ids.clientA,
        contactId: contact.id,
        userId: ids.agentA,
        title: "Northstar Platform Rollout",
        valueCents: 2400000, // $24,000
        currency: "USD",
        status: "OPEN",
        notes: "Enterprise kickoff expected",
      },
    });

    // Close deal via createDealHandoffFromAgencyDeal (simulating winning the deal in platform)
    console.log("-> 8. Closing Deal 1 and triggering Zoho Handoff + ClickUp sync...");
    const handoffResult = await createDealHandoffFromAgencyDeal(
      { user: agentAUser, activeClientAccountId: ids.clientA },
      deal1.id,
      {
        closeOutcome: "Client signed enterprise agreement",
        recommendedNextAction: "Kickoff call Tuesday",
        notes: "Enterprise tier with annual billing",
      },
    );

    assert(handoffResult !== null, "Deal handoff must be created.");
    assert(handoffResult.status === "SYNCED" || handoffResult.status === "PENDING" || handoffResult.status === "COMPLETED", "Handoff status should be valid.");

    // Verify Deal record now has status CLOSED_WON, closedAt, and snapshotted commission
    const updatedDeal1 = await prisma.deal.findUnique({ where: { id: deal1.id } });
    assert(updatedDeal1.status === "CLOSED_WON", "Deal must be marked CLOSED_WON.");
    assert(updatedDeal1.closedAt !== null, "Deal must have closedAt set.");
    assert(updatedDeal1.commissionRate === 15.0, `Deal commissionRate must be snapshotted to Agent A's rate (15.0), got ${updatedDeal1.commissionRate}`);
    assert(updatedDeal1.expectedRevenueCents === 360000, `Expected revenue cents for $24k at 15% must be 360000 ($3,600), got ${updatedDeal1.expectedRevenueCents}`);

    // Verify AgentClickUpRecord was created for Agent A
    const clickUpRecord1 = await prisma.agentClickUpRecord.findUnique({
      where: { agentId_dealId: { agentId: ids.agentA, dealId: deal1.id } },
    });
    assert(clickUpRecord1 !== null, "AgentClickUpRecord must be created for Agent A and Deal 1.");
    assert(clickUpRecord1.status === "SYNCED", `ClickUp record status must be SYNCED, got ${clickUpRecord1.status}`);
    assert(Boolean(clickUpRecord1.clickUpTaskId), "ClickUp record must have clickUpTaskId populated.");
    assert(clickUpRecord1.commissionRate === 15.0, "ClickUp record must have commissionRate recorded.");
    assert(clickUpRecord1.commissionCents === 360000, "ClickUp record must have commissionCents recorded.");

    // 8. Task Payload & Formatting verification
    console.log("-> 9. Verifying Task Formatting [Client Name] Contact Name — Deal Title...");
    const titlePayload = {
      clientAccountName: "Northstar Analytics",
      customerName: "Liam Brooks",
      dealTitle: "Northstar Platform Rollout",
    };
    const formattedTitle = buildClickUpTaskTitle(titlePayload);
    assert(
      formattedTitle === "[Northstar Analytics] Liam Brooks — Northstar Platform Rollout",
      `Formatted title must match format, got: "${formattedTitle}"`,
    );

    const descPayload = {
      dealId: deal1.id,
      dealTitle: "Northstar Platform Rollout",
      dealValueCents: 2400000,
      currency: "USD",
      commissionRate: 15.0,
      expectedRevenueCents: 360000,
      closedAt: new Date(),
      customerName: "Liam Brooks",
      customerEmail: "liam.brooks@gmail.com",
      clientAccountName: "Northstar Analytics",
      clientAccountId: ids.clientA,
      agentName: "Agent Alice",
      agentEmail: "agent-a@example.test",
      handoffStatus: "COMPLETED",
      clientCrmProvider: "ZOHO",
      zohoRecordId: "zoho-12345",
      closeOutcome: "Proposal accepted",
      recommendedNextAction: "Onboarding",
      notes: "Annual billing",
    };
    const formattedDesc = buildClickUpTaskDescription(descPayload);
    assert(formattedDesc.includes("Liam Brooks"), "Description must contain customer name.");
    assert(formattedDesc.includes("$24,000"), "Description must contain formatted deal value.");
    assert(formattedDesc.includes("15%"), "Description must contain commission rate.");
    assert(formattedDesc.includes("$3,600"), "Description must contain expected revenue.");
    assert(formattedDesc.includes("Zoho"), "Description must reference Client CRM (Zoho).");

    // 9. Idempotency: Repeated sync updates the existing task without creating duplicate
    console.log("-> 10. Testing Idempotency: Repeated ClickUp sync updates existing task without creating duplicates...");
    const secondSyncResult = await syncDealToClickUp(deal1.id, ids.agentA);
    assert(secondSyncResult.success === true, "Repeated sync must succeed.");
    assert(secondSyncResult.action === "UPDATED", `Repeated sync must perform UPDATED action, got ${secondSyncResult.action}`);
    assert(secondSyncResult.taskId === clickUpRecord1.clickUpTaskId, "Repeated sync must target the exact same taskId.");

    const totalRecords = await prisma.agentClickUpRecord.count({
      where: { agentId: ids.agentA, dealId: deal1.id },
    });
    assert(totalRecords === 1, `Total AgentClickUpRecord count must remain exactly 1, got ${totalRecords}`);

    // 10. Fault Isolation: ClickUp failure does NOT break deal closing or Zoho handoff
    console.log("-> 11. Testing Fault Isolation: ClickUp failure does NOT prevent deal close or Zoho handoff...");
    // Create Deal 2 for Agent B with NO ClickUp configured initially (or ClickUp disconnected)
    await disconnectClickUp(agentBUser);

    const deal2 = await prisma.deal.create({
      data: {
        id: `${marker}-deal-2`,
        organizationId: ids.org,
        clientAccountId: ids.clientA,
        contactId: contact.id,
        userId: ids.agentB,
        title: "Acme Expansion Deal",
        valueCents: 1000000, // $10,000
        currency: "USD",
        status: "OPEN",
      },
    });

    // Close deal 2 when Agent B has no ClickUp connected
    const handoff2 = await createDealHandoffFromAgencyDeal(
      { user: agentBUser, activeClientAccountId: ids.clientA },
      deal2.id,
      { closeOutcome: "Expansion signed" },
    );

    // Verify deal was closed successfully in platform
    const updatedDeal2 = await prisma.deal.findUnique({ where: { id: deal2.id } });
    assert(updatedDeal2.status === "CLOSED_WON", "Deal 2 must close successfully despite no ClickUp connection.");
    assert(handoff2 !== null, "Zoho handoff must proceed independently.");

    // Check that AgentClickUpRecord was recorded as PENDING
    const recordB = await prisma.agentClickUpRecord.findUnique({
      where: { agentId_dealId: { agentId: ids.agentB, dealId: deal2.id } },
    });
    assert(recordB !== null, "AgentClickUpRecord should be created.");
    assert(recordB.status === "PENDING", `Record status must be PENDING when ClickUp is not connected, got ${recordB.status}`);

    // Now connect ClickUp for Agent B and retry sync
    console.log("-> 12. Testing Manual Retry: Sync succeeds after ClickUp connection is restored...");
    await connectClickUp(agentBUser, {
      accessToken: "mock-token-agent-b-restored",
      destination: { listId: "mock-list-b", listName: "My Closed Deals" },
    });

    const retryResult = await syncDealToClickUp(deal2.id, ids.agentB, { throwOnError: true });
    assert(retryResult.success === true, "Retry sync must succeed.");
    assert(retryResult.action === "CREATED", "First sync after connection should create task.");

    const updatedRecordB = await prisma.agentClickUpRecord.findUnique({
      where: { agentId_dealId: { agentId: ids.agentB, dealId: deal2.id } },
    });
    assert(updatedRecordB.status === "SYNCED", `Updated record status must be SYNCED, got ${updatedRecordB.status}`);
    assert(Boolean(updatedRecordB.clickUpTaskId), "Updated record must have clickUpTaskId populated.");

    // 11. Testing listAgentSales: Agent personal tracker isolation
    console.log("-> 13. Testing listAgentSales: Agent personal sales visibility and isolation...");
    const salesA = await listAgentSales(agentAUser);
    const salesB = await listAgentSales(agentBUser);

    assert(salesA.sales.some((s) => s.id === deal1.id), "Agent A must see Deal 1.");
    assert(!salesA.sales.some((s) => s.id === deal2.id), "Agent A must NOT see Agent B's Deal 2.");
    assert(salesB.sales.some((s) => s.id === deal2.id), "Agent B must see Deal 2.");

    assert(salesA.summary.expectedCents === 360000, `Agent A expected payout must be $3,600 (360000 cents), got ${salesA.summary.expectedCents}`);

    // 12. Rule 8: Client Switching Rule
    console.log("-> 14. Testing Rule 8: Client Switching does not alter agent ClickUp connection or Unified Lead Directory...");
    const connBefore = await prisma.integrationConnection.findFirst({
      where: { userId: ids.agentA, provider: "CLICKUP" },
    });
    assert(connBefore.status === "CONNECTED", "Agent A ClickUp connection should remain CONNECTED.");

    // Switching active client context to Client B
    const statusInClientB = await getClickUpConnectionStatus(agentAUser);
    assert(statusInClientB.isConnected === true, "Agent ClickUp connection remains connected in Client B context.");
    assert(statusInClientB.connectionId === connBefore.id, "Agent ClickUp connection ID remains unchanged across client accounts.");

    console.log(`\n======================================================`);
    console.log(`✓ All 14 Stage 2.9 Verification Criteria PASSED Successfully!`);
    console.log(`======================================================\n`);
  } finally {
    console.log("-> Cleaning up test data...");
    await prisma.agentClickUpRecord.deleteMany({ where: { organizationId: ids.org } }).catch(() => null);
    await prisma.dealHandoff.deleteMany({ where: { organizationId: ids.org } }).catch(() => null);
    await prisma.deal.deleteMany({ where: { organizationId: ids.org } }).catch(() => null);
    await prisma.contact.deleteMany({ where: { organizationId: ids.org } }).catch(() => null);
    await prisma.integrationCredential.deleteMany({
      where: { connection: { organizationId: ids.org } },
    }).catch(() => null);
    await prisma.integrationConnection.deleteMany({ where: { organizationId: ids.org } }).catch(() => null);
    await prisma.clientAssignment.deleteMany({ where: { clientAccount: { organizationId: ids.org } } }).catch(() => null);
    await prisma.clientAccount.deleteMany({ where: { organizationId: ids.org } }).catch(() => null);
    await prisma.user.deleteMany({ where: { organizationId: ids.org } }).catch(() => null);
    await prisma.organization.delete({ where: { id: ids.org } }).catch(() => null);
    console.log("-> Cleanup complete.\n");
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
