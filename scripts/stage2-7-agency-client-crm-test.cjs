const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the Stage 2.7 test.");
process.env.INTEGRATION_ENCRYPTION_KEY ||= Buffer.alloc(32, 7).toString("base64");
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
const { activeCampaignAdapter } = require(path.join(root, "src", "lib", "integrations", "activecampaign", "adapter.ts"));
const { fetchActiveCampaignRecords } = require(path.join(root, "src", "lib", "integrations", "activecampaign", "client.ts"));
const { updateAgencyDeal, updateActiveClientDeal } = require(path.join(root, "src", "lib", "sync", "sales-crm-service.ts"));
const { getActiveClientContacts } = require(path.join(root, "src", "lib", "sync", "contact-sync-service.ts"));
const { createDealHandoffFromAgencyDeal, dispatchHandoffToClientCrm, retryDealHandoff, listDealHandoffs } = require(path.join(root, "src", "lib", "handoff", "handoff-service.ts"));
const { listClientCrmRecords, updateClientCrmRecord, syncClientCrm } = require(path.join(root, "src", "lib", "client-crm", "client-crm-service.ts"));

const marker = `stage27-${Date.now()}`;
const ids = {
  org: `${marker}-org`,
  agent: `${marker}-agent`,
  clientA: `${marker}-client-a`,
  clientB: `${marker}-client-b`,
  agencyHubspotConn: `${marker}-hubspot-agency`,
  clientAcConnA: `${marker}-ac-client-a`,
  clientAcConnB: `${marker}-ac-client-b`,
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    throw new Error(message);
  }
};

async function main() {
  console.log(`Starting Stage 2.7 Agency CRM & Client Handoff Verification: ${marker}`);

  // 1. Setup Organization, Clients, Agent User
  await prisma.organization.create({
    data: {
      id: ids.org,
      name: `Agency Org ${marker}`,
      users: {
        create: {
          id: ids.agent,
          email: `${marker}-agent@example.test`,
          name: "Agency Sales Agent",
          role: "AGENT",
          status: "ACTIVE",
        },
      },
      clients: {
        createMany: {
          data: [
            { id: ids.clientA, name: "Client Alpha", brandName: "Alpha Corp" },
            { id: ids.clientB, name: "Client Beta", brandName: "Beta LLC" },
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

  // 2. Setup Agency CRM: COMPANY-owned HubSpot Connection
  const agencyHubspot = await prisma.integrationConnection.create({
    data: {
      id: ids.agencyHubspotConn,
      organizationId: ids.org,
      ownershipType: "COMPANY",
      ownershipKey: `org:${ids.org}:HUBSPOT`,
      clientAccountId: null,
      provider: "HUBSPOT",
      providerAccountId: "hubspot-agency-portal-99",
      status: "CONNECTED",
      scopes: ["crm.objects.contacts.read", "crm.objects.deals.read", "crm.objects.deals.write"],
      credential: {
        create: {
          encryptedAccessToken: encryptIntegrationSecret("hubspot-agency-token"),
          accessTokenExpiresAt: new Date(Date.now() + 86400000),
        },
      },
    },
  });

  assert(agencyHubspot.ownershipType === "COMPANY", "Agency HubSpot must be COMPANY owned");
  assert(agencyHubspot.clientAccountId === null, "Agency HubSpot clientAccountId must be null");

  // Verify connection-resolution helper for Agency CRM
  const agencyQuery = agencyIntegrationWhere(ids.org, "HUBSPOT");
  const foundAgencyConn = await prisma.integrationConnection.findFirst({ where: agencyQuery });
  assert(foundAgencyConn?.id === ids.agencyHubspotConn, "agencyIntegrationWhere must resolve Agency HubSpot");

  // 3. Setup Client CRMs: CLIENT_ACCOUNT-owned ActiveCampaign Connections
  const clientAcA = await prisma.integrationConnection.create({
    data: {
      id: ids.clientAcConnA,
      organizationId: ids.org,
      ownershipType: "CLIENT_ACCOUNT",
      ownershipKey: `client:${ids.clientA}:ACTIVECAMPAIGN`,
      clientAccountId: ids.clientA,
      provider: "ACTIVECAMPAIGN",
      providerAccountId: "ac-account-alpha",
      status: "CONNECTED",
      scopes: ["contacts.read", "contacts.write", "deals.read", "deals.write"],
      credential: {
        create: {
          encryptedAccessToken: encryptIntegrationSecret("ac-api-key-alpha"),
          encryptedRefreshToken: encryptIntegrationSecret("https://alpha.api-us1.com/api/3"),
        },
      },
    },
  });

  const clientAcB = await prisma.integrationConnection.create({
    data: {
      id: ids.clientAcConnB,
      organizationId: ids.org,
      ownershipType: "CLIENT_ACCOUNT",
      ownershipKey: `client:${ids.clientB}:ACTIVECAMPAIGN`,
      clientAccountId: ids.clientB,
      provider: "ACTIVECAMPAIGN",
      providerAccountId: "ac-account-beta",
      status: "CONNECTED",
      scopes: ["contacts.read", "contacts.write", "deals.read", "deals.write"],
      credential: {
        create: {
          encryptedAccessToken: encryptIntegrationSecret("ac-api-key-beta"),
          encryptedRefreshToken: encryptIntegrationSecret("https://beta.api-us1.com/api/3"),
        },
      },
    },
  });

  assert(clientAcA.ownershipType === "CLIENT_ACCOUNT" && clientAcA.clientAccountId === ids.clientA, "Client A ActiveCampaign must be CLIENT_ACCOUNT owned");
  assert(clientAcB.ownershipType === "CLIENT_ACCOUNT" && clientAcB.clientAccountId === ids.clientB, "Client B ActiveCampaign must be CLIENT_ACCOUNT owned");

  // Verify connection-resolution helper for Client CRM
  const clientAQuery = clientIntegrationWhere(ids.org, ids.clientA, "ACTIVECAMPAIGN");
  const foundClientAConn = await prisma.integrationConnection.findFirst({ where: clientAQuery });
  assert(foundClientAConn?.id === ids.clientAcConnA, "clientIntegrationWhere must resolve Client A ActiveCampaign");

  // 4. Test ActiveCampaign Adapter & Client directly
  assert(activeCampaignAdapter.provider === "ACTIVECAMPAIGN", "Adapter provider must be ACTIVECAMPAIGN");
  assert(activeCampaignAdapter.capabilities.listContacts === true, "Adapter must support listContacts");
  assert(activeCampaignAdapter.capabilities.updateContact === true, "Adapter must support updateContact");

  const acRecords = await fetchActiveCampaignRecords(clientAcA);
  assert(acRecords.length > 0, "ActiveCampaign client must return records for client A");
  assert(acRecords.some((r) => r.recordType === "CONTACT"), "ActiveCampaign client must return contacts");

  // 5. Test Unified Leads backed by Agency CRM
  // Populate agency leads (HubSpot source, associated with clientA and clientB)
  const contact1 = await prisma.contact.create({
    data: {
      organizationId: ids.org,
      clientAccountId: ids.clientA,
      firstName: "Katherine",
      lastName: "Johnson",
      email: `${marker}-katherine@nasa.test`,
      company: "NASA",
      externalRecords: {
        create: {
          clientAccountId: ids.clientA,
          connectionId: ids.agencyHubspotConn,
          objectType: "CONTACT",
          externalId: `${marker}-hs-1`,
        },
      },
    },
  });
  const contact2 = await prisma.contact.create({
    data: {
      organizationId: ids.org,
      clientAccountId: ids.clientB,
      firstName: "Margaret",
      lastName: "Hamilton",
      email: `${marker}-margaret@mit.test`,
      company: "MIT",
      externalRecords: {
        create: {
          clientAccountId: ids.clientB,
          connectionId: ids.agencyHubspotConn,
          objectType: "CONTACT",
          externalId: `${marker}-hs-2`,
        },
      },
    },
  });

  const contextA = {
    user: { id: ids.agent, organizationId: ids.org, name: "Agency Sales Agent", email: `${marker}-agent@example.test`, role: "AGENT" },
    activeClientAccountId: ids.clientA,
  };
  const contextB = {
    ...contextA,
    activeClientAccountId: ids.clientB,
  };

  // With scope="agency", contacts across both clients are returned
  const agencyLeadsA = await getActiveClientContacts(contextA, { scope: "agency" });
  assert(agencyLeadsA.some(c => c.id === contact1.id) && agencyLeadsA.some(c => c.id === contact2.id), "Agency-scoped leads must return all agency pipeline contacts");

  // Changing active client context to Client B does NOT change agency leads
  const agencyLeadsB = await getActiveClientContacts(contextB, { scope: "agency" });
  assert(agencyLeadsB.length === agencyLeadsA.length, "Agency leads must remain stable across client switches");

  // 6. Agency Deal Lifecycle & Deal Handoff
  // Create Agency Deal associated with Client A
  const dealAlpha = await prisma.deal.create({
    data: {
      organizationId: ids.org,
      clientAccountId: ids.clientA,
      title: "Alpha Enterprise Contract",
      valueCents: 5000000,
      currency: "USD",
      status: "OPEN",
      stageLabel: "Negotiation",
      contactLinks: {
        create: { contactId: contact1.id },
      },
    },
  });

  assert(dealAlpha.clientAccountId === ids.clientA, "Agency deal must be associated with Client A");

  // Update deal using updateAgencyDeal (or updateActiveClientDeal alias)
  const updatedResult = await updateAgencyDeal(contextA, dealAlpha.id, {
    title: "Alpha Enterprise Contract - Final",
    amount: 55000,
  });
  assert(updatedResult.deal.title === "Alpha Enterprise Contract - Final", "Deal update must succeed");

  // Verify that an OPEN deal does NOT have a handoff yet
  const handoffsBeforeWon = await prisma.dealHandoff.findMany({
    where: { agencyDealId: dealAlpha.id },
  });
  assert(handoffsBeforeWon.length === 0, "No handoff before deal is CLOSED_WON");

  // Mark deal as CLOSED_WON
  const wonResult = await updateAgencyDeal(contextA, dealAlpha.id, {
    stageLabel: "Closed Won",
  });
  assert(wonResult.deal.status === "CLOSED_WON", "Deal must transition to CLOSED_WON");

  // Check that DealHandoff was automatically created and dispatched to ActiveCampaign
  const handoffsAfterWon = await prisma.dealHandoff.findMany({
    where: { agencyDealId: dealAlpha.id },
  });
  assert(handoffsAfterWon.length === 1, "Exactly one DealHandoff must be created for CLOSED_WON deal");
  const handoff = handoffsAfterWon[0];
  assert(handoff.clientAccountId === ids.clientA, "Handoff clientAccountId must match deal clientAccountId");
  assert(handoff.clientCrmProvider === "ACTIVECAMPAIGN", "Handoff clientCrmProvider must be ACTIVECAMPAIGN");
  assert(handoff.status === "SYNCED", `Handoff should complete sync (status was: ${handoff.status})`);
  assert(handoff.clientCrmRecordId !== null, "Handoff must record clientCrmRecordId upon successful sync");

  // Check that ClientCrmRecord was created in Client A's CRM
  const clientCrmRecordsA = await prisma.clientCrmRecord.findMany({
    where: { clientAccountId: ids.clientA },
  });
  const syncedDealRec = clientCrmRecordsA.find(r => r.externalId === handoff.clientCrmRecordId);
  assert(syncedDealRec !== undefined, "ClientCrmRecord referenced by handoff must exist");
  assert(syncedDealRec.provider === "ACTIVECAMPAIGN", "ClientCrmRecord provider must be ACTIVECAMPAIGN");

  // Idempotency: marking CLOSED_WON again must not create duplicate handoff
  await updateAgencyDeal(contextA, dealAlpha.id, { stageLabel: "Closed Won" });
  const handoffsAfterSecondWon = await prisma.dealHandoff.findMany({
    where: { agencyDealId: dealAlpha.id },
  });
  assert(handoffsAfterSecondWon.length === 1, "Handoff creation must be idempotent");

  // 7. Test Failure and Retry Logic
  // Create another deal for Client B and simulate a failed handoff
  const dealBeta = await prisma.deal.create({
    data: {
      organizationId: ids.org,
      clientAccountId: ids.clientB,
      title: "Beta Growth Deal",
      valueCents: 2000000,
      currency: "USD",
      status: "OPEN",
    },
  });

  // Temporarily break Client B connection to test failure
  await prisma.integrationConnection.update({
    where: { id: ids.clientAcConnB },
    data: { status: "ERROR", lastError: "Connection simulated down" },
  });

  // Create manual handoff for Beta deal that will fail
  const failedHandoff = await prisma.dealHandoff.create({
    data: {
      organizationId: ids.org,
      agencyDealId: dealBeta.id,
      clientAccountId: ids.clientB,
      dealName: dealBeta.title,
      dealAmountCents: dealBeta.valueCents,
      currency: "USD",
      closeStatus: "CLOSED_WON",
      closeDate: new Date(),
      clientCrmProvider: "ACTIVECAMPAIGN",
      status: "FAILED",
      lastError: "Connection simulated down",
      retryCount: 1,
    },
  });

  assert(failedHandoff.status === "FAILED", "Failed handoff must have status FAILED");

  // Now restore Client B connection and test retry
  await prisma.integrationConnection.update({
    where: { id: ids.clientAcConnB },
    data: { status: "CONNECTED", lastError: null },
  });

  const retriedResult = await retryDealHandoff(contextB, failedHandoff.id);
  assert(retriedResult.status === "SYNCED", "Retried handoff must succeed and reach SYNCED");
  assert(retriedResult.clientCrmRecordId !== null, "Retried handoff must populate clientCrmRecordId");

  // 8. Test Client CRM Service Operations & Isolation
  // List records for Client A
  const clientARecords = await listClientCrmRecords(contextA);
  assert(clientARecords.length > 0, "Client A must have records");
  assert(clientARecords.every(r => r.clientAccountId === ids.clientA), "All returned records must belong to Client A");

  // List records for Client B
  const clientBRecords = await listClientCrmRecords(contextB);
  assert(clientBRecords.every(r => r.clientAccountId === ids.clientB), "All returned records must belong to Client B");
  assert(!clientBRecords.some(r => r.id === clientARecords[0]?.id), "Client B must NOT see Client A's records");

  // Cross-client record update rejection
  let isolatedUpdateFailed = false;
  try {
    await updateClientCrmRecord(contextB, clientARecords[0].id, { name: "Hacked" });
  } catch (err) {
    isolatedUpdateFailed = err?.code === "RECORD_NOT_FOUND";
  }
  assert(isolatedUpdateFailed, "Cross-client record update must be rejected with RECORD_NOT_FOUND");

  // Client record update with local-first and ActiveCampaign push
  const recordToUpdate = clientARecords[0];
  const updatedRec = await updateClientCrmRecord(contextA, recordToUpdate.id, {
    name: "Updated Record Name",
  });
  assert(updatedRec.record.name === "Updated Record Name", "Record update must reflect new name");

  // Manual Client CRM Sync
  const syncResult = await syncClientCrm(contextA);
  assert(syncResult.count >= 0, "syncClientCrm must succeed");

  // 9. Cross-Client Handoff Isolation
  const clientAHandoffs = await listDealHandoffs(contextA);
  assert(clientAHandoffs.every(h => h.clientAccountId === ids.clientA), "Client A handoff list must only contain Client A handoffs");

  const clientBHandoffs = await listDealHandoffs(contextB);
  assert(clientBHandoffs.every(h => h.clientAccountId === ids.clientB), "Client B handoff list must only contain Client B handoffs");

  // 10. Audit Log Verification
  const auditLogs = await prisma.auditLog.findMany({
    where: { organizationId: ids.org },
  });
  const actions = auditLogs.map(a => a.action);
  assert(actions.includes("DEAL_HANDOFF_CREATED"), "Audit trail must include DEAL_HANDOFF_CREATED");
  assert(actions.includes("DEAL_HANDOFF_SYNC_STARTED"), "Audit trail must include DEAL_HANDOFF_SYNC_STARTED");
  assert(actions.includes("DEAL_HANDOFF_SYNC_COMPLETED"), "Audit trail must include DEAL_HANDOFF_SYNC_COMPLETED");
  assert(actions.includes("CLIENT_CRM_RECORD_UPDATED"), "Audit trail must include CLIENT_CRM_RECORD_UPDATED");
  assert(actions.includes("CLIENT_CRM_SYNC_COMPLETED"), "Audit trail must include CLIENT_CRM_SYNC_COMPLETED");

  console.log(JSON.stringify({
    stage: "2.7",
    marker,
    status: "passed",
    checks: {
      agencyHubspotCompanyOwned: true,
      clientActiveCampaignClientOwned: true,
      unifiedLeadsAgencyScope: true,
      agencyDealHandoffOnClosedWon: true,
      activeCampaignSyncAndWriteback: true,
      handoffRetrySuccessful: true,
      crossClientIsolationEnforced: true,
      auditTrailComplete: true,
    },
  }));
}

main()
  .finally(async () => {
    // Cleanup fixture organization
    await prisma.organization.deleteMany({ where: { id: ids.org } });
    await prisma.$disconnect();
  })
  .catch((err) => {
    console.error("Stage 2.7 test failed:", err);
    process.exitCode = 1;
  });
