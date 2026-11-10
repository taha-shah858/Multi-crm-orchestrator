// No database or external network: exercise authorization and callback PKCE.
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const { createHash, randomBytes } = require("node:crypto");
const ts = require("typescript"), root = path.resolve(__dirname, "..");
process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString("base64");
for (const prefix of ["CALENDLY", "GOOGLE_CALENDAR", "OUTLOOK_CALENDAR"]) {
  process.env[`${prefix}_CLIENT_ID`] = "test-client";
  process.env[`${prefix}_CLIENT_SECRET`] = "test-secret";
  process.env[`${prefix}_REDIRECT_URI`] = "https://example.test/callback";
}
let pending, exchanges = [], connections = [];
const prisma = {
  calendarOAuthState: {
    deleteMany: async () => ({}),
    create: async ({ data }) => { pending = { id: "state-id", ...data }; },
    findFirst: async ({ where }) => pending && !pending.usedAt && where.stateHash === pending.stateHash && where.provider === pending.provider && where.userId === pending.userId && where.organizationId === pending.organizationId ? pending : null,
    updateMany: async () => { pending.usedAt = new Date(); return { count: 1 }; },
    findUnique: async () => pending,
  },
  $queryRaw: async () => [],
  calendarConnection: { upsert: async value => { connections.push(value); } },
  auditLog: { create: async () => ({}) },
  $transaction: async action => action(prisma),
};
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function (request, parent, isMain, options) { return resolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, parent, isMain, options); };
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "@/lib/db/prisma") return { prisma };
  return load.call(this, request, parent, isMain);
};
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const oauth = require("../src/lib/calendar/calendar-oauth.ts");
const { decryptIntegrationSecret } = require("../src/lib/integrations/credential-crypto.ts");
const { beginCalendarConnection, completeCalendarConnection } = require("../src/lib/calendar/calendar-connections.ts");
global.fetch = async (url, options) => {
  if (url === "https://auth.calendly.com/oauth/token") {
    exchanges.push(Object.fromEntries(options.body));
    assert.equal(options.headers.authorization, `Basic ${Buffer.from("test-client:test-secret").toString("base64")}`);
    return Response.json({ access_token: "test-token", refresh_token: "test-refresh", expires_in: 3600 });
  }
  assert.equal(url, "https://api.calendly.com/users/me");
  return Response.json({ resource: { uri: "https://api.calendly.com/users/test", name: "Test" } });
};
(async () => {
  for (const provider of ["GOOGLE", "OUTLOOK", "CALENDLY"]) {
    const url = new URL(oauth.calendarAuthorizationUrl(provider, "state", "verifier"));
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.get("code_challenge"), createHash("sha256").update("verifier").digest("base64url"));
    assert.equal(url.searchParams.has("code_verifier"), false);
  }
  const user = { id: "agent", organizationId: "org", role: "AGENT" };
  const url = new URL(await beginCalendarConnection(user, "CALENDLY"));
  assert.equal(url.origin, "https://auth.calendly.com");
  const verifier = decryptIntegrationSecret(pending.encryptedVerifier);
  assert.equal(url.searchParams.get("code_challenge"), createHash("sha256").update(verifier).digest("base64url"));
  await assert.rejects(completeCalendarConnection({ ...user, id: "other" }, "CALENDLY", url.searchParams.get("state"), "code", "test"));
  assert.equal(exchanges.length, 0);
  await completeCalendarConnection(user, "CALENDLY", url.searchParams.get("state"), "code", "test");
  assert.equal(exchanges[0].code_verifier, verifier);
  assert.equal(exchanges[0].redirect_uri, "https://example.test/callback");
  assert.equal(connections.length, 1);
  await assert.rejects(completeCalendarConnection(user, "CALENDLY", url.searchParams.get("state"), "code", "test"));
  assert.equal(exchanges.length, 1);
  console.log("PASS: provider challenges, Calendly encrypted verifier round trip, token exchange, owner isolation and replay rejection");
})().catch(error => { console.error(error); process.exitCode = 1; });
