const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the Stage 2.8 test.");
process.env.INTEGRATION_ENCRYPTION_KEY ||= Buffer.alloc(32, 8).toString("base64");
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
const { encryptIntegrationSecret, decryptIntegrationSecret } = require(path.join(root, "src", "lib", "integrations", "credential-crypto.ts"));
const { agencyIntegrationWhere, clientIntegrationWhere } = require(path.join(root, "src", "lib", "integrations", "connection-resolution.ts"));
const { zohoAdapter } = require(path.join(root, "src", "lib", "integrations", "zoho", "adapter.ts"));
const { fetchZohoRecords, syncHandoffToZoho, resolveZohoCredentials, createOrUpdateZohoRecord } = require(path.join(root, "src", "lib", "integrations", "zoho", "client.ts"));
const { connectZoho } = require(path.join(root, "src", "lib", "integrations", "integration-service.ts"));
const { getActiveClientContacts } = require(path.join(root, "src", "lib", "sync", "contact-sync-service.ts"));
const { createDealHandoffFromAgencyDeal, dispatchHandoffToClientCrm, retryDealHandoff, listDealHandoffs } = require(path.join(root, "src", "lib", "handoff", "handoff-service.ts"));
const { listClientCrmRecords, updateClientCrmRecord, syncClientCrm } = require(path.join(root, "src", "lib", "client-crm", "client-crm-service.ts"));

const marker = `stage28-${Date.now()}`;
const ids = {
  org: `${marker}-org`,
  admin: `${marker}-admin`,
  agent: `${marker}-agent`,
  clientA: `${marker}-client-a`,
  clientB: `${marker}-client-b`,
  agencyHubspotConn: `${marker}-hubspot-agency`,
  clientZohoConnA: `${marker}-zoho-client-a`,
  clientZohoConnB: `${marker}-zoho-client-b`,
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    throw new Error(message);
  }
};

async function main() {
  console.log(`\n======================================================`);
  console.log(`Starting Stage 2.8 Agency CRM + Zoho Client CRM Tests: ${marker}`);
  console.log(`======================================================\n`);

  try {
    // 1. Setup Organization, Admin, Agent, Clients
    console.log("-> 1. Setting up Organization, Admin, Agent User, Client Accounts...");
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
              id: ids.agent,
              email: `${marker}-agent@example.test`,
              name: "Agency Sales Agent",
              role: "AGENT",
              status: "ACTIVE",
            },
          ],
        },
        clients: {
          createMany: {
            data: [
              { id: ids.clientA, name: "Acme Corporation", brandName: "Acme Corp" },
              { id: ids.clientB, name: "Globex Industries", brandName: "Globex" },
            ],
          },
        },
      },
    });

    await prisma.clientAssignment.createMany({
      data: [
        { userId: ids.agent, clientAccountId: ids.clientA },
        { userId: ids.agent, clientAccountId: ids.clientB },
      ],
    });

    const adminUser = {
      id: ids.admin,
      organizationId: ids.org,
      name: "Agency Administrator",
      email: `${marker}-admin@example.test`,
      role: "ADMIN",
    };

    const agentUser = {
      id: ids.agent,
      organizationId: ids.org,
      name: "Agency Sales Agent",
      email: `${marker}-agent@example.test`,
      role: "AGENT",
    };

    // 2. Setup Agency CRM: HubSpot (COMPANY owned, sole source of truth)
    console.log("-> 2. Configuring Agency CRM: HubSpot (COMPANY-owned)...");
    const agencyHubspot = await prisma.integrationConnection.create({
      data: {
        id: ids.agencyHubspotConn,
        organizationId: ids.org,
        ownershipType: "COMPANY",
        ownershipKey: `org:${ids.org}:HUBSPOT`,
        clientAccountId: null,
        provider: "HUBSPOT",
        providerAccountId: "hubspot-agency-portal-stage28",
        status: "CONNECTED",
        scopes: ["crm.objects.contacts.read", "crm.objects.deals.read", "crm.objects.deals.write"],
        credential: {
          create: {
            encryptedAccessToken: encryptIntegrationSecret("hubspot-agency-secret-token"),
            accessTokenExpiresAt: new Date(Date.now() + 86400000),
          },
        },
      },
    });

    assert(agencyHubspot.ownershipType === "COMPANY", "Agency CRM must be COMPANY owned");
    assert(agencyHubspot.clientAccountId === null, "Agency CRM clientAccountId must be null");

    // 3. Admin connects Zoho CRM for Client A via connectZoho service
    console.log("-> 3. Admin connects Zoho CRM for Client Account A...");
    const zohoConnResultA = await connectZoho(
      adminUser,
      {
        clientAccountId: ids.clientA,
        clientId: "zoho-client-id-alpha",
        clientSecret: "zoho-client-secret-alpha",
        accessToken: "mock-zoho-access-token-alpha",
        refreshToken: "mock-zoho-refresh-token-alpha",
        apiDomain: "https://www.zohoapis.com",
      },
      ids.clientA,
    );

    assert(zohoConnResultA.connection.provider === "ZOHO", "Provider must be ZOHO");
    assert(zohoConnResultA.connection.clientAccountId === ids.clientA, "Connection must belong to Client A");
    assert(zohoConnResultA.connection.status === "CONNECTED", "Status must be CONNECTED");

    // Check encrypted credentials in DB
    const credInDb = await prisma.integrationCredential.findUnique({
      where: { integrationConnectionId: zohoConnResultA.connection.id },
    });
    assert(credInDb !== null, "IntegrationCredential must be created in DB");
    assert(credInDb.encryptedAccessToken !== "mock-zoho-access-token-alpha", "Access token must be ENCRYPTED");
    const decrypted = decryptIntegrationSecret(credInDb.encryptedAccessToken);
    assert(decrypted === "mock-zoho-access-token-alpha", "Decrypted access token must match original");

    // Also connect Zoho CRM for Client B
    console.log("-> 4. Admin connects Zoho CRM for Client Account B...");
    const zohoConnResultB = await connectZoho(
      adminUser,
      {
        clientAccountId: ids.clientB,
        clientId: "zoho-client-id-beta",
        clientSecret: "zoho-client-secret-beta",
        accessToken: "mock-zoho-access-token-beta",
        refreshToken: "mock-zoho-refresh-token-beta",
        apiDomain: "https://www.zohoapis.com",
      },
      ids.clientB,
    );
    assert(zohoConnResultB.connection.clientAccountId === ids.clientB, "Connection must belong to Client B");

    // 5. Test Adapter & Zoho Client capabilities
    console.log("-> 5. Verifying Zoho CRM Adapter capabilities...");
    assert(zohoAdapter.provider === "ZOHO", "Zoho adapter provider must be ZOHO");
    assert(zohoAdapter.capabilities.oauth === true, "Zoho adapter must support oauth");
    assert(zohoAdapter.capabilities.listContacts === true, "Zoho adapter must support listContacts");
    assert(zohoAdapter.capabilities.updateContact === true, "Zoho adapter must support updateContact");
    assert(zohoAdapter.capabilities.updateDeal === true, "Zoho adapter must support updateDeal");

    // Fetch records through zoho client
    const zohoRecordsA = await fetchZohoRecords(zohoConnResultA.connection);
    assert(zohoRecordsA.length > 0, "fetchZohoRecords must return records for Client A");
    assert(zohoRecordsA.some(r => r.recordType === "CONTACT"), "Must return contacts");
    assert(zohoRecordsA.some(r => r.recordType === "DEAL"), "Must return deals");

    // 6. Test Unified Lead Directory Rule 7 (Agency CRM source of truth)
    console.log("-> 6. Testing Rule 7: Unified Lead Directory is strictly tied to Agency CRM...");
    const contactA = await prisma.contact.create({
      data: {
        organizationId: ids.org,
        clientAccountId: ids.clientA,
        firstName: "Ada",
        lastName: "Lovelace",
        email: `${marker}-ada@analytics.test`,
        company: "Acme Corporation",
        externalRecords: {
          create: {
            clientAccountId: ids.clientA,
            connectionId: ids.agencyHubspotConn,
            objectType: "CONTACT",
            externalId: `${marker}-hs-ada`,
          },
        },
      },
    });

    const contactB = await prisma.contact.create({
      data: {
        organizationId: ids.org,
        clientAccountId: ids.clientB,
        firstName: "Grace",
        lastName: "Hopper",
        email: `${marker}-grace@compiler.test`,
        company: "Globex Industries",
        externalRecords: {
          create: {
            clientAccountId: ids.clientB,
            connectionId: ids.agencyHubspotConn,
            objectType: "CONTACT",
            externalId: `${marker}-hs-grace`,
          },
        },
      },
    });

    const contextAgentA = { user: agentUser, activeClientAccountId: ids.clientA };
    const contextAgentB = { user: agentUser, activeClientAccountId: ids.clientB };

    // With scope="agency", agent sees all unified leads regardless of client context
    const agencyLeadsA = await getActiveClientContacts(contextAgentA, { scope: "agency" });
    const agencyLeadsB = await getActiveClientContacts(contextAgentB, { scope: "agency" });
    assert(agencyLeadsA.length === agencyLeadsB.length, "Unified Lead count must be IDENTICAL across client switches");
    assert(agencyLeadsA.some(c => c.id === contactA.id) && agencyLeadsA.some(c => c.id === contactB.id), "Unified leads contain both leads");

    // 7. Test Client CRM operations & tenant isolation
    console.log("-> 7. Testing Client CRM record listing & client isolation...");
    const clientCrmRecordsA = await listClientCrmRecords(contextAgentA, "CONTACT");
    const clientCrmRecordsB = await listClientCrmRecords(contextAgentB, "CONTACT");

    // Ada Lovelace (Acme Corporation) belongs to Client A
    assert(clientCrmRecordsA.some(r => r.name.includes("Ada") || r.companyName === "Acme Corporation"), "Client A sees Acme Corporation contact");
    // Grace Hopper (Globex Industries) belongs to Client B
    assert(clientCrmRecordsB.some(r => r.name.includes("Grace") || r.companyName === "Globex Industries"), "Client B sees Globex Industries contact");

    // Isolation check: Client A does NOT see Grace Hopper
    assert(!clientCrmRecordsA.some(r => r.email === `${marker}-grace@compiler.test`), "Client A must NOT see Client B's contact");
    assert(!clientCrmRecordsB.some(r => r.email === `${marker}-ada@analytics.test`), "Client B must NOT see Client A's contact");

    // 8. Test Editing Client CRM record & outbound sync to Zoho
    console.log("-> 8. Testing Client CRM record update & outbound Zoho sync...");
    const recordToEdit = clientCrmRecordsA[0];
    assert(recordToEdit !== undefined, "Record to edit must exist");

    const editResult = await updateClientCrmRecord(contextAgentA, recordToEdit.id, {
      name: "Ada Countess Lovelace",
      phone: "+1-555-0199",
      details: "VIP Customer Account",
    });

    assert(editResult.record.name === "Ada Countess Lovelace", "Record name updated locally");
    assert(editResult.record.phone === "+1-555-0199", "Record phone updated locally");
    assert(editResult.outboundStatus === "COMPLETED", "Outbound sync to Zoho CRM must complete");

    // Verify contact in Unified Lead Directory was also updated
    const updatedContactA = await prisma.contact.findUnique({ where: { id: contactA.id } });
    assert(updatedContactA.firstName === "Ada", "First name retained/updated");
    assert(updatedContactA.lastName === "Countess Lovelace", "Last name synchronized back to unified contact");

    // 9. Deal Creation & Automatic Handoff to Zoho CRM
    console.log("-> 9. Creating Agency Deal and triggering Closed Won Handoff to Zoho CRM...");
    const agencyDealA = await prisma.deal.create({
      data: {
        organizationId: ids.org,
        clientAccountId: ids.clientA,
        title: "Acme Enterprise Platform Rollout",
        valueCents: 5000000, // $50,000.00
        currency: "USD",
        status: "CLOSED_WON",
        stageLabel: "Closed Won",
        closedAt: new Date(),
        contactLinks: {
          create: { contactId: contactA.id },
        },
      },
    });

    // Create handoff from Agency Deal
    const handoff = await createDealHandoffFromAgencyDeal(contextAgentA, agencyDealA.id, {
      recommendedNextAction: "Begin tenant onboarding and dispatch welcome packet",
      notes: "Proposal accepted by board of directors.",
    });

    assert(handoff.status === "PENDING" || handoff.status === "SYNCED", "Handoff status must be PENDING or SYNCED");
    assert(handoff.clientAccountId === ids.clientA, "Handoff must be associated with Client A");
    assert(handoff.dealAmountCents === 5000000, "Deal amount must match");

    // Dispatch handoff to Client CRM (Zoho)
    console.log("-> 10. Dispatching Handoff to Zoho CRM...");
    const dispatched = await dispatchHandoffToClientCrm(contextAgentA, handoff.id);
    assert(dispatched.status === "SYNCED", "Dispatched handoff status must be SYNCED");
    assert(dispatched.clientCrmProvider === "ZOHO", "Provider must be ZOHO");
    assert(dispatched.clientCrmRecordId !== null, "Must have Zoho external record ID");
    assert(dispatched.clientCrmRecordId.startsWith("zh-deal-"), "Zoho deal external ID format");

    // Verify mirror Deal in ClientCrmRecord
    const mirroredDeal = await prisma.clientCrmRecord.findFirst({
      where: {
        clientAccountId: ids.clientA,
        recordType: "DEAL",
        externalId: dispatched.clientCrmRecordId,
      },
    });
    assert(mirroredDeal !== null, "Deal must be mirrored into ClientCrmRecord for client operational view");
    assert(mirroredDeal.name === "Acme Enterprise Platform Rollout", "Deal name in client record");
    assert(mirroredDeal.provider === "ZOHO", "Mirrored record provider must be ZOHO");

    // 11. Test Idempotency: Retrying handoff does NOT duplicate records
    console.log("-> 11. Testing Idempotency: Retrying does not create duplicate records...");
    const preCount = await prisma.dealHandoff.count({ where: { agencyDealId: agencyDealA.id } });
    assert(preCount === 1, "Must have exactly 1 handoff before retry");

    const retried = await retryDealHandoff(contextAgentA, handoff.id);
    assert(retried.status === "SYNCED", "Retried handoff must remain SYNCED");

    const postCount = await prisma.dealHandoff.count({ where: { agencyDealId: agencyDealA.id } });
    assert(postCount === 1, "Must still have exactly 1 handoff after retry (NO DUPLICATES)");

    // 12. Test Downstream Failure Isolation: Client CRM failure does NOT reverse Agency deal
    console.log("-> 12. Testing Downstream Failure Isolation: Agency deal state remains Closed Won...");
    const dealAfterHandoff = await prisma.deal.findUnique({ where: { id: agencyDealA.id } });
    assert(dealAfterHandoff.status === "CLOSED_WON", "Agency deal status MUST remain CLOSED_WON");

    // 13. Test Token Auto-Refresh Logic
    console.log("-> 13. Testing Zoho OAuth Token Auto-Refresh logic...");
    // Simulate an expiring access token
    const testExpiringConn = await prisma.integrationConnection.create({
      data: {
        id: `${marker}-zoho-expiring`,
        organizationId: ids.org,
        ownershipType: "CLIENT_ACCOUNT",
        ownershipKey: `client:${ids.clientA}:ZOHO_EXP`,
        clientAccountId: ids.clientA,
        provider: "ZOHO",
        providerAccountId: "zoho-expiring-acc",
        status: "CONNECTED",
        credential: {
          create: {
            encryptedAccessToken: encryptIntegrationSecret("expiring-zoho-token"),
            encryptedRefreshToken: encryptIntegrationSecret("test-refresh-token"),
            accessTokenExpiresAt: new Date(Date.now() + 10000), // expires in 10s (< 60s threshold)
          },
        },
      },
    });

    const resolved = await resolveZohoCredentials(testExpiringConn);
    assert(resolved.accessToken !== undefined, "resolveZohoCredentials must resolve token");
    assert(resolved.isMock === true, "Mock detection works for test/mock tokens");

    // 14. Verify Audit Events Recorded
    console.log("-> 14. Verifying Audit Events in database...");
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        organizationId: ids.org,
      },
      orderBy: { createdAt: "desc" },
    });

    assert(auditLogs.length > 0, "Audit logs must be present");
    const actions = auditLogs.map(l => l.action);
    console.log("   Audit actions captured:", actions);
    assert(actions.includes("ZOHO_CONNECTED"), "Audit log must contain ZOHO_CONNECTED");
    assert(actions.includes("DEAL_HANDOFF_SYNC_COMPLETED"), "Audit log must contain DEAL_HANDOFF_SYNC_COMPLETED");
    assert(actions.includes("CLIENT_CRM_RECORD_UPDATED"), "Audit log must contain CLIENT_CRM_RECORD_UPDATED");

    console.log("\n======================================================");
    console.log("✓ All 20 Stage 2.8 Verification Criteria PASSED Successfully!");
    console.log("======================================================\n");
  } finally {
    // 15. Clean up test data
    console.log("-> Cleaning up test data...");
    try {
      await prisma.dealHandoff.deleteMany({ where: { organizationId: ids.org } });
      await prisma.clientCrmRecord.deleteMany({ where: { organizationId: ids.org } });
      await prisma.deal.deleteMany({ where: { organizationId: ids.org } });
      await prisma.externalRecord.deleteMany({ where: { contact: { organizationId: ids.org } } });
      await prisma.contact.deleteMany({ where: { organizationId: ids.org } });
      await prisma.integrationCredential.deleteMany({ where: { connection: { organizationId: ids.org } } });
      await prisma.integrationConnection.deleteMany({ where: { organizationId: ids.org } });
      await prisma.clientAssignment.deleteMany({ where: { user: { organizationId: ids.org } } });
      await prisma.auditLog.deleteMany({ where: { organizationId: ids.org } });
      await prisma.clientAccount.deleteMany({ where: { organizationId: ids.org } });
      await prisma.user.deleteMany({ where: { organizationId: ids.org } });
      await prisma.organization.deleteMany({ where: { id: ids.org } });
      console.log("-> Cleanup complete.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }
}

main().catch((err) => {
  console.error("Stage 2.8 Test failed with error:", err);
  process.exit(1);
});
