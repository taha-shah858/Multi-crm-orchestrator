// Disposable PostgreSQL fixtures. Every provider request is intercepted; no
// email is sent and no real CRM account or retained user is changed.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const assert = require('node:assert/strict'), { randomBytes } = require('node:crypto'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env.local'), quiet: true });
Object.assign(process.env, { NODE_ENV: 'test', APP_URL: 'http://localhost:3000', ZOHO_CLIENT_ID: 'fixture-client', ZOHO_CLIENT_SECRET: 'fixture-secret', ZOHO_REDIRECT_URI: 'http://localhost:3000/api/integrations/zoho/callback', ZOHO_ACCOUNTS_URL: 'https://accounts.zoho.com', ZOHO_API_DOMAIN: 'https://www.zohoapis.com', INTEGRATION_ENCRYPTION_KEY: randomBytes(32).toString('base64') });
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function(n,p,m,o) { return resolve.call(this,n.startsWith('@/') ? path.join(root,'src',n.slice(2)) : n,p,m,o); };
Module._load = function(n,p,m) { return n === 'server-only' ? {} : load.call(this,n,p,m); };
require.extensions['.ts'] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,f);
const { prisma } = require('../src/lib/db/prisma.ts');
const service = require('../src/lib/integrations/zoho/connection-requests.ts');
const integration = require('../src/lib/integrations/integration-service.ts');
const { verifyZohoIdentity, zohoOrigin } = require('../src/lib/integrations/zoho/identity.ts');
const { createSession } = require('../src/lib/auth/auth-service.ts');
const { NextRequest } = require('next/server');
const callback = require('../src/app/api/integrations/zoho/callback/route.ts');
const publicApi = require('../src/app/api/zoho-invitation/route.ts');
const adminApi = require('../src/app/api/integrations/zoho/requests/route.ts');
const connectApi = require('../src/app/api/integrations/zoho/connect/route.ts');
const removeApi = require('../src/app/api/integrations/[id]/remove/route.ts');
const marker = 'zoho-onboard-' + Date.now();
const org = marker, foreignOrg = marker + '-other';
const admin = { id: marker + '-admin', organizationId: org, role: 'ADMIN', name: 'Fixture Admin', email: marker + '@example.test' };
const agent = { ...admin, id: marker + '-agent', role: 'AGENT', email: marker + '-agent@example.test' };
const outsider = { ...admin, id: marker + '-outside', organizationId: foreignOrg, email: marker + '-outside@example.test' };
const clients = ['a','b','c','d'].map(value => marker + '-' + value);
let tokenCalls = 0, identityFailure = false, wrongIdentity = false;
const originalFetch = global.fetch;
global.fetch = async (value, options = {}) => {
  const url = new URL(String(value));
  assert.ok(['accounts.zoho.com','accounts.zoho.eu','www.zohoapis.com','www.zohoapis.eu'].includes(url.hostname), 'Unexpected outbound request');
  if (url.pathname === '/oauth/v2/token') {
    tokenCalls++;
    const input = new URLSearchParams(options.body);
    const id = input.get('code') || input.get('refresh_token').split('_').at(-1);
    if (id === 'failed') return Response.json({ error: 'invalid_grant' }, { status: 400 });
    const domain = url.hostname.endsWith('.eu') ? 'https://www.zohoapis.eu' : 'https://www.zohoapis.com';
    return Response.json({ access_token: 'fixture_access_' + id, refresh_token: 'fixture_refresh_' + id, expires_in: 3600, api_domain: domain });
  }
  if (identityFailure) return Response.json({ code: 'OAUTH_SCOPE_MISMATCH' }, { status: 401 });
  const id = options.headers.Authorization.split('_').at(-1);
  if (url.pathname.endsWith('/org')) return Response.json({ org: [{ id: wrongIdentity ? '9999' : id, company_name: 'Company ' + id }] });
  if (url.pathname.endsWith('/users')) return Response.json({ users: [{ id: '9001', full_name: 'Client Representative' }] });
  throw Error('Unexpected provider path: ' + url.pathname);
};
const tokenFrom = invitation => new URLSearchParams(new URL(invitation.invitationUrl).hash.slice(1)).get('token');
const requestId = state => prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { stateHash: require('node:crypto').createHash('sha256').update(state).digest('hex') } }).then(row => row.id);
const confirmation = (client, organization, replace = false) => ({ confirmedClientId: client, confirmedOrganizationId: organization, confirmReplacement: replace });
const post = (url, body, cookie = '') => new NextRequest('http://localhost:3000' + url, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', cookie }, body: JSON.stringify(body) });
async function consent(client, code, region) {
  const invitation = await service.createZohoInvitation(admin, client);
  const started = await service.beginInvitedZohoOAuth(tokenFrom(invitation), region);
  await service.stageZohoConsent(started.state, code, { browser: started.browser, accountsServer: region });
  return invitation.id;
}
let count = 0;
const passed = label => { count++; console.log('PASS ' + label); };
async function main() {
  try {
    await prisma.organization.create({ data: { id: org, name: marker, clients: { create: clients.map(id => ({ id, name: id, brandName: id, allowAgentIntegrationManagement: true })) } } });
    await prisma.organization.create({ data: { id: foreignOrg, name: foreignOrg } });
    await prisma.user.createMany({ data: [admin, agent, outsider].map(row => ({ ...row, status: 'ACTIVE' })) });
    await prisma.clientAssignment.create({ data: { clientAccountId: clients[0], userId: agent.id } });
    const session = await createSession(admin.id), cookie = 'multi_crm_session=' + session.token;
    await assert.rejects(service.createZohoInvitation(agent, clients[0]), error => error.code === 'FORBIDDEN');
    await assert.rejects(service.createZohoInvitation(outsider, clients[0]));
    await assert.rejects(service.listZohoRequests(agent));
    passed('Admin authorization and client/agency isolation');

    const created = await adminApi.POST(post('/api/integrations/zoho/requests', { clientAccountId: clients[0] }, cookie));
    assert.equal(created.status, 201);
    const invitation = await created.json(), token = tokenFrom(invitation);
    const stored = await prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { id: invitation.id } });
    assert.notEqual(stored.tokenHash, token);
    const preview = await publicApi.POST(post('/api/zoho-invitation', { action: 'inspect', token }));
    assert.equal(preview.status, 200);
    assert.equal((await preview.json()).clientName, clients[0]);
    const hostile = post('/api/zoho-invitation', { action: 'authorize', token });
    hostile.headers.set('origin', 'https://attacker.invalid');
    assert.equal((await publicApi.POST(hostile)).status, 403);
    passed('Hashed invitation and anonymous landing page; cross-origin POST denied');

    const startedResponse = await publicApi.POST(post('/api/zoho-invitation', { action: 'authorize', token }));
    assert.equal(startedResponse.status, 200);
    const auth = new URL((await startedResponse.json()).authorizationUrl);
    assert.ok(auth.searchParams.get('scope').includes('ZohoCRM.org.READ'));
    const state = auth.searchParams.get('state');
    const binding = startedResponse.headers.get('set-cookie').split(';')[0];
    assert.ok(startedResponse.headers.get('set-cookie').includes('HttpOnly'));
    const callbackUrl = 'http://localhost:3000/api/integrations/zoho/callback?state=' + state + '&code=1001';
    const beforeCalls = tokenCalls;
    const missing = await callback.GET(new NextRequest(callbackUrl));
    assert.ok(missing.headers.get('location').includes('failed'));
    assert.equal(tokenCalls, beforeCalls);
    const received = await callback.GET(new NextRequest(callbackUrl, { headers: { cookie: binding } }));
    assert.ok(received.headers.get('location').includes('result=review'));
    assert.equal(await prisma.integrationConnection.count({ where: { organizationId: org } }), 0);
    const row = await prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { id: invitation.id } });
    assert.equal(row.providerOrganizationId, '1001');
    assert.equal(row.providerOrganizationName, 'Company 1001');
    assert.notEqual(row.encryptedAccessToken, 'fixture_access_1001');
    const replay = await callback.GET(new NextRequest(callbackUrl, { headers: { cookie: binding } }));
    assert.ok(replay.headers.get('location').includes('failed'));
    assert.equal(tokenCalls, beforeCalls + 1);
    passed('Anonymous OAuth requires browser binding; consent stages verified identity once without activation');

    const summary = JSON.stringify(await service.listZohoRequests(admin));
    for (const secret of [token, 'encryptedAccessToken', 'encryptedRefreshToken', 'browserHash', 'tokenHash', 'fixture_access_1001']) assert.ok(!summary.includes(secret));
    await assert.rejects(service.approveZohoRequest(admin, invitation.id, {}));
    await assert.rejects(service.approveZohoRequest(outsider, invitation.id, confirmation(clients[0], '1001')));
    const approved = await service.approveZohoRequest(admin, invitation.id, confirmation(clients[0], '1001'));
    assert.equal(approved.connection.providerAccountName, 'Company 1001');
    const credentialA = await prisma.integrationCredential.findUniqueOrThrow({ where: { integrationConnectionId: approved.connection.id } });
    assert.equal((await prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { id: invitation.id } })).encryptedAccessToken, null);
    await assert.rejects(service.approveZohoRequest(admin, invitation.id, confirmation(clients[0], '1001')));
    passed('Explicit identity approval, cross-agency denial, secret redaction and post-approval erasure');

    const b = await consent(clients[1], '1002');
    await service.approveZohoRequest(admin, b, confirmation(clients[1], '1002'));
    assert.deepEqual(await prisma.integrationCredential.findUnique({ where: { integrationConnectionId: approved.connection.id } }), credentialA);
    assert.equal(await prisma.integrationConnection.count({ where: { organizationId: org, status: 'CONNECTED' } }), 2);
    passed('Second client connects without changing the first client tokens');

    const reconnect = await consent(clients[0], '1001');
    await assert.rejects(service.approveZohoRequest(admin, reconnect, confirmation(clients[0], '1001')), error => error.status === 409);
    await service.approveZohoRequest(admin, reconnect, confirmation(clients[0], '1001', true));
    const duplicate = await consent(clients[2], '1001');
    await assert.rejects(service.approveZohoRequest(admin, duplicate, confirmation(clients[2], '1001')), error => error.status === 409);
    passed('Replacement requires confirmation and wrong-client duplicate organizations are blocked');

    const imported = await prisma.clientCrmRecord.create({ data: { organizationId: org, clientAccountId: clients[0], provider: 'ZOHO', recordType: 'CONTACT', name: 'Existing imported record', externalId: '8001', connectionId: approved.connection.id } });
    const changedOrg = await consent(clients[0], '1003');
    await assert.rejects(service.approveZohoRequest(admin, changedOrg, confirmation(clients[0], '1003', true)), error => error.status === 409);
    assert.equal((await prisma.integrationConnection.findUniqueOrThrow({ where: { id: approved.connection.id } })).providerAccountId, '1001');
    assert.ok(await prisma.clientCrmRecord.findUnique({ where: { id: imported.id } }));
    passed('Organization change with stored Zoho mappings is rejected without deleting data');

    const failedInvite = await service.createZohoInvitation(admin, clients[2]);
    const failedStart = await service.beginInvitedZohoOAuth(tokenFrom(failedInvite));
    identityFailure = true;
    await assert.rejects(service.stageZohoConsent(failedStart.state, '1004', { browser: failedStart.browser }));
    identityFailure = false;
    const failure = await prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { id: failedInvite.id } });
    assert.equal(failure.status, 'FAILED'); assert.equal(failure.encryptedAccessToken, null);
    passed('Failed identity verification never activates a connection');

    const revoked = await service.createZohoInvitation(admin, clients[2]);
    const revokeStart = await service.beginInvitedZohoOAuth(tokenFrom(revoked));
    await service.revokeZohoRequest(admin, revoked.id);
    await assert.rejects(service.stageZohoConsent(revokeStart.state, '1004', { browser: revokeStart.browser }));
    const expired = await service.createZohoInvitation(admin, clients[2]);
    await prisma.zohoConnectionRequest.update({ where: { id: expired.id }, data: { expiresAt: new Date(0) } });
    await assert.rejects(service.inspectZohoInvitation(tokenFrom(expired)));
    const blocked = await service.createZohoInvitation(admin, clients[2]);
    const blockedStart = await service.beginInvitedZohoOAuth(tokenFrom(blocked));
    await prisma.user.update({ where: { id: admin.id }, data: { status: 'SUSPENDED' } });
    await assert.rejects(service.stageZohoConsent(blockedStart.state, '1004', { browser: blockedStart.browser }));
    await prisma.user.update({ where: { id: admin.id }, data: { status: 'ACTIVE' } });
    passed('Revoked/expired invitations and withdrawn issuer access fail closed');

    const direct = await integration.beginZohoOAuth(admin, { clientAccountId: clients[2] });
    const directState = new URL(direct.authorizationUrl).searchParams.get('state');
    const unauthenticated = await callback.GET(new NextRequest('http://localhost:3000/api/integrations/zoho/callback?state=' + directState + '&code=1004'));
    assert.ok(unauthenticated.headers.get('location').includes('integration=error'));
    await integration.completeZohoOAuth(admin, directState, '1004');
    assert.equal(await prisma.integrationConnection.count({ where: { organizationId: org, clientAccountId: clients[2] } }), 0);
    const directId = await requestId(directState);
    await service.approveZohoRequest(admin, directId, confirmation(clients[2], '1004'));
    assert.equal((await connectApi.POST(post('/api/integrations/zoho/connect', { accessToken: 'raw-secret', clientAccountId: clients[0] }, cookie))).status, 422);
    passed('Authenticated direct OAuth also stages approval; raw token endpoint cannot bypass it');

    const eu = await consent(clients[3], '1005', 'https://accounts.zoho.eu');
    await prisma.zohoConnectionRequest.update({ where: { id: eu }, data: { accessTokenExpiresAt: new Date(0) } });
    const parallel = await Promise.allSettled([service.approveZohoRequest(admin, eu, confirmation(clients[3], '1005')), service.approveZohoRequest(admin, eu, confirmation(clients[3], '1005'))]);
    assert.equal(parallel.filter(result => result.status === 'fulfilled').length, 1);
    const euConnection = await prisma.integrationConnection.findFirstOrThrow({ where: { clientAccountId: clients[3], provider: 'ZOHO' } });
    assert.equal((await prisma.integrationCredential.findUniqueOrThrow({ where: { integrationConnectionId: euConnection.id } })).metadata.accountsUrl, 'https://accounts.zoho.eu');
    passed('Regional token refresh and concurrent approval finalize exactly once');

    assert.throws(() => zohoOrigin('https://accounts.zoho.com.attacker.invalid', 'accounts'));
    assert.throws(() => zohoOrigin('http://127.0.0.1:9000', 'api'));
    await assert.rejects(verifyZohoIdentity('fixture_access_1001', 'https://attacker.invalid'));
    const drifted = await consent(clients[2], '1004');
    wrongIdentity = true;
    await assert.rejects(service.approveZohoRequest(admin, drifted, confirmation(clients[2], '1004', true)));
    wrongIdentity = false;
    passed('Untrusted token/identity hosts and identity changes are rejected');

    const pending = await consent(clients[2], '1004');
    await prisma.zohoConnectionRequest.update({ where: { id: pending }, data: { expiresAt: new Date(0) } });
    await service.expireZohoRequests(org);
    const cleaned = await prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { id: pending } });
    assert.equal(cleaned.status, 'EXPIRED'); assert.equal(cleaned.encryptedAccessToken, null);
    const proxy = require('../src/proxy.ts').proxy;
    assert.equal(proxy(new NextRequest('http://localhost:3000/connect-zoho')).headers.get('location'), null);
    assert.ok(proxy(new NextRequest('http://localhost:3000/admin/integrations')).headers.get('location').includes('/login'));
    passed('Expired staged tokens are cleared and only invitation landing bypasses page login');

    const rollbackRequest = await consent(clients[0], '1001');
    const previousCredential = await prisma.integrationCredential.findUnique({ where: { integrationConnectionId: approved.connection.id } });
    const clientInstance = global.prisma, originalTransaction = clientInstance.$transaction.bind(clientInstance);
    clientInstance.$transaction = (fn, ...args) => originalTransaction(db => fn(new Proxy(db, { get(target, key) {
      return key === 'auditLog' ? { ...target.auditLog, create: async () => { throw Error('Fixture audit failure'); } } : Reflect.get(target, key);
    } })), ...args);
    try { await assert.rejects(service.approveZohoRequest(admin, rollbackRequest, confirmation(clients[0], '1001', true))); }
    finally { clientInstance.$transaction = originalTransaction; }
    assert.deepEqual(await prisma.integrationCredential.findUnique({ where: { integrationConnectionId: approved.connection.id } }), previousCredential);
    assert.equal((await prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { id: rollbackRequest } })).status, 'REVIEW');
    passed('Audit failure rolls back replacement, staged consumption and credential changes atomically');

    const stale = await consent(clients[0], '1001');
    await prisma.integrationConnection.update({ where: { id: approved.connection.id }, data: { connectedAt: new Date(Date.now() + 1000) } });
    await assert.rejects(service.approveZohoRequest(admin, stale, confirmation(clients[0], '1001', true)), error => error.status === 409);
    const oauthExpired = await service.createZohoInvitation(admin, clients[2]);
    const oauthExpiredStart = await service.beginInvitedZohoOAuth(tokenFrom(oauthExpired));
    await prisma.zohoConnectionRequest.update({ where: { id: oauthExpired.id }, data: { oauthExpiresAt: new Date(0) } });
    await assert.rejects(service.stageZohoConsent(oauthExpiredStart.state, '1004', { browser: oauthExpiredStart.browser }));
    const deniedInvite = await service.createZohoInvitation(admin, clients[2]);
    const deniedStart = await service.beginInvitedZohoOAuth(tokenFrom(deniedInvite));
    await assert.rejects(service.stageZohoConsent(deniedStart.state, '', { browser: deniedStart.browser, denied: true }));
    assert.equal((await prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { id: deniedInvite.id } })).status, 'FAILED');
    passed('Stale replacement snapshots, expired OAuth attempts and denied consent retain existing connections');

    const competingC = await consent(clients[2], '7777');
    const competingD = await consent(clients[3], '7777');
    const duplicateRace = await Promise.allSettled([
      service.approveZohoRequest(admin, competingC, confirmation(clients[2], '7777', true)),
      service.approveZohoRequest(admin, competingD, confirmation(clients[3], '7777', true)),
    ]);
    assert.equal(duplicateRace.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(await prisma.integrationConnection.count({ where: { organizationId: org, providerAccountId: '7777' } }), 1);
    passed('Competing approvals cannot attach one Zoho organization to different clients');

    const disconnectRequest = await consent(clients[1], '1002');
    const connectionB = await prisma.integrationConnection.findFirstOrThrow({ where: { clientAccountId: clients[1], provider: 'ZOHO' } });
    await Promise.allSettled([
      service.approveZohoRequest(admin, disconnectRequest, confirmation(clients[1], '1002', true)),
      integration.disconnectIntegration(admin, connectionB.id),
    ]);
    assert.equal((await prisma.integrationConnection.findUniqueOrThrow({ where: { id: connectionB.id } })).status, 'DISCONNECTED');
    assert.equal(await prisma.integrationCredential.findUnique({ where: { integrationConnectionId: connectionB.id } }), null);
    assert.equal(await prisma.zohoConnectionRequest.count({ where: { clientAccountId: clients[1], status: { in: ['PENDING','AUTHORIZING','PROCESSING','REVIEW'] } } }), 0);
    passed('Disconnect cancels pending requests and cannot be undone by a racing approval');

    const connectionA = approved.connection.id;
    const mapping = await prisma.externalRecord.create({ data: { clientAccountId: clients[0], connectionId: connectionA, externalId: 'removal-mapping', objectType: 'CONTACT' } });
    const removalReview = await consent(clients[0], '1001');
    await assert.rejects(integration.removeIntegration(agent, connectionA, connectionA), error => error.status === 403);
    await assert.rejects(integration.removeIntegration(outsider, connectionA, connectionA), error => error.status === 404);
    await assert.rejects(integration.removeIntegration(admin, connectionA, connectionB.id), error => error.status === 422);
    const removalParams = { params: Promise.resolve({ id: connectionA }) };
    const crossOriginRemoval = post('/api/integrations/' + connectionA + '/remove', { confirmedConnectionId: connectionA }, cookie);
    crossOriginRemoval.headers.set('origin', 'https://attacker.invalid');
    assert.equal((await removeApi.POST(crossOriginRemoval, removalParams)).status, 403);
    const removalCredential = await prisma.integrationCredential.findUniqueOrThrow({ where: { integrationConnectionId: connectionA } });
    clientInstance.$transaction = (fn, ...args) => originalTransaction(db => fn(new Proxy(db, { get(target, key) {
      return key === 'auditLog' ? { ...target.auditLog, create: async () => { throw Error('Fixture removal audit failure'); } } : Reflect.get(target, key);
    } })), ...args);
    try { await assert.rejects(integration.removeIntegration(admin, connectionA, connectionA)); }
    finally { clientInstance.$transaction = originalTransaction; }
    assert.equal((await prisma.integrationConnection.findUniqueOrThrow({ where: { id: connectionA } })).removedAt, null);
    assert.deepEqual(await prisma.integrationCredential.findUniqueOrThrow({ where: { integrationConnectionId: connectionA } }), removalCredential);
    passed('Removal requires agency authorization, exact confirmation and same-origin HTTP; audit failure rolls it back');

    const removed = await removeApi.POST(post('/api/integrations/' + connectionA + '/remove', { confirmedConnectionId: connectionA }, cookie), removalParams);
    assert.equal(removed.status, 200);
    const removedConnection = await prisma.integrationConnection.findUniqueOrThrow({ where: { id: connectionA } });
    assert.ok(removedConnection.removedAt);
    assert.equal(removedConnection.status, 'DISCONNECTED');
    assert.equal(await prisma.integrationCredential.findUnique({ where: { integrationConnectionId: connectionA } }), null);
    assert.ok(await prisma.externalRecord.findUnique({ where: { id: mapping.id } }));
    assert.ok(await prisma.clientCrmRecord.findUnique({ where: { id: imported.id } }));
    assert.equal((await prisma.zohoConnectionRequest.findUniqueOrThrow({ where: { id: removalReview } })).status, 'REVOKED');
    assert.ok(!(await integration.listIntegrationConnections(admin)).some(row => row.id === connectionA));
    await assert.rejects(integration.runIntegrationSync(admin, connectionA, marker), error => error.status === 404);
    const wrongAfterRemoval = await consent(clients[0], '9998');
    await assert.rejects(service.approveZohoRequest(admin, wrongAfterRemoval, confirmation(clients[0], '9998', true)), error => error.status === 409);
    const restore = await consent(clients[0], '1001');
    await service.approveZohoRequest(admin, restore, confirmation(clients[0], '1001', true));
    assert.equal((await prisma.integrationConnection.findUniqueOrThrow({ where: { id: connectionA } })).removedAt, null);
    assert.ok((await integration.listIntegrationConnections(admin)).some(row => row.id === connectionA));
    passed('Removal hides connection and erases secrets while retaining records; wrong-org bypass blocked and same-org reconnection restores it');

    const agencyHubspot = await prisma.integrationConnection.create({ data: { organizationId: org, ownershipType: 'COMPANY', ownershipKey: 'company:' + org, provider: 'HUBSPOT', status: 'CONNECTED' } });
    const legacyHubspot = await prisma.integrationConnection.create({ data: { organizationId: org, clientAccountId: clients[0], ownershipType: 'CLIENT_ACCOUNT', ownershipKey: 'client:' + clients[0], provider: 'HUBSPOT', status: 'DISCONNECTED' } });
    const legacyMapping = await prisma.externalRecord.create({ data: { clientAccountId: clients[0], connectionId: legacyHubspot.id, externalId: 'hubspot-preserved', objectType: 'CONTACT' } });
    await integration.removeIntegration(admin, legacyHubspot.id, legacyHubspot.id);
    assert.ok(await prisma.externalRecord.findUnique({ where: { id: legacyMapping.id } }));
    assert.equal((await prisma.integrationConnection.findUniqueOrThrow({ where: { id: agencyHubspot.id } })).status, 'CONNECTED');
    assert.equal((await prisma.integrationConnection.findUniqueOrThrow({ where: { id: agencyHubspot.id } })).removedAt, null);
    passed('Removing a legacy client HubSpot connection preserves mappings and leaves the company HubSpot connection intact');
    console.log(count + ' Zoho onboarding checks passed. No live provider calls or emails.');
  } finally {
    global.fetch = originalFetch;
    await prisma.emailVerificationToken.deleteMany({ where: { email: { startsWith: marker } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org, foreignOrg] } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
