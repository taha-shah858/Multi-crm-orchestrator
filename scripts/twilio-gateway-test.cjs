const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), assert = require("node:assert/strict"), ts = require("typescript");
const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env.local"), quiet: true });
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function(name, parent, main, options) { return resolve.call(this, name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name, parent, main, options); };
Module._load = function(name, parent, main) { return name === "server-only" ? {} : name === "@/lib/sync/contact-sync-service" ? { prepareActiveClientSync: async () => {} } : load.call(this, name, parent, main); };
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const twilio = require("twilio"), { prisma } = require("../src/lib/db/prisma.ts");
const { validateTwilioWebhook, twilioWebhookResponse, handleTwilioWebhook, mergeTwilioStatus } = require("../src/lib/communications/twilio-webhooks.ts");
const { dispatchCommunication } = require("../src/lib/communications/communication-service.ts");
const adminRoute = require("../src/app/api/admin/communications/route.ts");
const { NextRequest } = require("next/server");
const { createHash } = require("node:crypto");
process.env.TWILIO_ACCOUNT_SID = "AC" + "a".repeat(32); process.env.TWILIO_AUTH_TOKEN = "test-only-token"; process.env.TWILIO_PUBLIC_URL = "https://twilio.example.test";
const marker = `twilio-${Date.now()}`, phone = "+15550009999";
function request(kind, params, valid = true) {
  const url = `https://twilio.example.test/api/communications/twilio/${kind}`;
  const values = { AccountSid: process.env.TWILIO_ACCOUNT_SID, ...params };
  return new Request(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": valid ? twilio.getExpectedTwilioSignature(process.env.TWILIO_AUTH_TOKEN, url, values) : "forged" }, body: new URLSearchParams(values) });
}
async function main() {
  try {
    const org = await prisma.organization.create({ data: { id: marker, name: marker } });
    const client = await prisma.clientAccount.create({ data: { organizationId: org.id, name: marker, brandName: marker } });
    const identity = await prisma.communicationIdentity.create({ data: { organizationId: org.id, clientAccountId: client.id, provider: "TWILIO", label: "Test", phoneNumber: phone } });
    const sms = { MessageSid: "SM" + "b".repeat(32), From: "+15550008888", To: phone, Body: "Incoming test" };
    assert.equal((await twilioWebhookResponse(request("sms", sms, false), "sms")).status, 403);
    assert.ok(await validateTwilioWebhook(request("sms", sms)));
    assert.equal(await validateTwilioWebhook(request("sms", { ...sms, AccountSid: "wrong" })), null);
    await Promise.all([handleTwilioWebhook("sms", sms), handleTwilioWebhook("sms", sms)]);
    assert.equal(await prisma.interaction.count({ where: { organizationId: org.id } }), 1);
    const record = await prisma.interaction.findFirstOrThrow({ where: { organizationId: org.id } });
    assert.equal(record.clientAccountId, client.id); assert.equal(record.direction, "INBOUND");
    const status = { ...sms, MessageStatus: "delivered" };
    assert.equal((await twilioWebhookResponse(request("status", status), "status")).status, 204);
    await handleTwilioWebhook("status", { ...sms, MessageStatus: "queued" });
    assert.equal((await prisma.interaction.findUniqueOrThrow({ where: { id: record.id } })).metadata.status, "delivered");
    assert.equal(await handleTwilioWebhook("sms", { ...sms, To: "+15550000000" }), null);
    process.env.TWILIO_INBOUND_ROUTES = JSON.stringify({ [phone]: "+15550007777" });
    const incoming = await twilioWebhookResponse(request("voice", { CallSid: "CA" + "f".repeat(32), From: sms.From, To: phone }), "voice");
    assert.match(await incoming.text(), /<Dial.*\+15550007777/);
    const agent = await prisma.user.create({ data: { organizationId: org.id, name: "Agent", email: `${marker}@example.test`, role: "AGENT", status: "ACTIVE" } });
    const context = { user: agent, activeClientAccountId: client.id };
    assert.equal((await adminRoute.GET(new NextRequest("https://app.example.test/api/admin/communications"))).status, 401);
    const sessionToken = `${marker}-session`;
    await prisma.authSession.create({ data: { userId: agent.id, tokenHash: createHash("sha256").update(sessionToken).digest("hex"), expiresAt: new Date(Date.now() + 60000) } });
    const agentRequest = new NextRequest("https://app.example.test/api/admin/communications", { headers: { cookie: `multi_crm_session=${sessionToken}` } });
    assert.equal((await adminRoute.GET(agentRequest)).status, 403);
    await prisma.user.update({ where: { id: agent.id }, data: { role: "ADMIN" } });
    assert.equal((await adminRoute.GET(agentRequest)).status, 200);
    const foreignClient = new NextRequest("https://app.example.test/api/admin/communications", { method: "POST", headers: { cookie: `multi_crm_session=${sessionToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ clientAccountId: "foreign", label: "Wrong client", phoneNumber: phone }) });
    assert.equal((await adminRoute.POST(foreignClient)).status, 403);
    const realFetch = global.fetch;
    let dispatches = 0;
    global.fetch = async (url, options) => {
      dispatches++;
      assert.match(String(url), /api.twilio.com/);
      assert.match(options.body.get("StatusCallback"), /status\?interactionId=/);
      if (String(url).endsWith("Calls.json")) {
        assert.equal(options.body.get("To"), "+15550006666");
        assert.match(options.body.get("Twiml"), /callerId="\+15550009999"/);
        assert.match(options.body.get("Twiml"), /\+15550008888/);
      }
      return Response.json({ sid: (String(url).endsWith("Calls.json") ? "CA" : "SM") + "1".repeat(32) });
    };
    try {
      const input = { identityId: identity.id, phoneNumber: sms.From, kind: "CALL", mode: "AUTOMATED", agentPhone: "+15550006666" };
      const outbound = await dispatchCommunication(context, input, marker);
      assert.equal(outbound.interaction.metadata.status, "queued");
      await assert.rejects(dispatchCommunication(context, { ...input, agentPhone: "" }, marker));
      assert.equal(dispatches, 1);
      const sent = await dispatchCommunication(context, { ...input, kind: "SMS", body: "Test SMS" }, marker);
      assert.equal(sent.interaction.type, "SMS");
      global.fetch = async () => { throw new Error("Lost response"); };
      await assert.rejects(dispatchCommunication(context, { ...input, kind: "SMS", body: "Uncertain" }, marker), /dispatch response uncertain/);
      assert.equal(await prisma.interaction.count({ where: { organizationId: org.id, metadata: { path: ["status"], equals: "review-required" } } }), 1);
    } finally { global.fetch = realFetch; }
    const second = await prisma.clientAccount.create({ data: { organizationId: org.id, name: "Second", brandName: "Second" } });
    await prisma.communicationIdentity.create({ data: { organizationId: org.id, clientAccountId: second.id, provider: "TWILIO", label: "Ambiguous", phoneNumber: phone } });
    assert.equal(await handleTwilioWebhook("sms", { ...sms, MessageSid: "SM" + "c".repeat(32) }), null);
    const outcome = mergeTwilioStatus({ status: "completed" }, { DialCallStatus: "busy", DialCallDuration: "0" });
    assert.equal(outcome.status, "busy"); assert.equal(outcome.durationSeconds, 0);
    assert.equal(mergeTwilioStatus({ status: "ringing" }, { CallStatus: "initiated" }).status, "ringing");
    const voice = await prisma.interaction.create({ data: { organizationId: org.id, clientAccountId: client.id, source: "TWILIO", type: "CALL", direction: "OUTBOUND", body: "Call", metadata: { from: phone, status: "dispatching" } } });
    const call = { CallSid: "CA" + "d".repeat(32), From: phone, DialCallStatus: "completed", DialCallDuration: "42" };
    await handleTwilioWebhook("status", call, voice.id);
    await handleTwilioWebhook("status", { CallSid: call.CallSid, From: phone, CallStatus: "ringing" }, voice.id);
    const saved = await prisma.interaction.findUniqueOrThrow({ where: { id: voice.id } });
    assert.equal(saved.metadata.durationSeconds, 42); assert.equal(saved.metadata.status, "completed"); assert.match(saved.body, /42 seconds/);
    assert.equal(await handleTwilioWebhook("status", { ...call, CallSid: "CA" + "e".repeat(32) }, voice.id), null);
    console.log("PASS Twilio signatures, account checks, duplicate delivery, client routing, SMS status ordering, inbound forwarding, outbound phone bridge, uncertain dispatch and call outcomes.");
  } finally { await prisma.organization.deleteMany({ where: { id: marker } }); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
