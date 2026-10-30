const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), assert = require("node:assert/strict"), ts = require("typescript");
const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env.local"), quiet: true });
const resolve = Module._resolveFilename, load = Module._load;
let calls = 0, responseText = "", fail = false, lastPrompt = "";
const valid = { summary: "Qualified prospect", budget: "$5,000", timeline: "next month", requirements: "CRM integration", intent: "proposal", objections: "None", leadScore: 82, temperature: "Hot", dealProbability: 74 };
const sdk = { GoogleGenAI: class { constructor(options) { assert.equal(options.apiKey, "fake-gemini-test-key"); assert.equal(options.httpOptions.timeout, 20000); this.models = { generateContent: async options => { calls++; lastPrompt = options.contents; assert.equal(options.config.responseMimeType, "application/json"); assert.ok(options.config.responseJsonSchema); assert.ok(options.contents.includes("Transcript:")); if (fail) throw Error("Provider unavailable"); return { text: responseText }; } }; } } };
Module._resolveFilename = function(name, parent, main, options) { return resolve.call(this, name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name, parent, main, options); };
Module._load = function(name, parent, main) { return name === "server-only" ? {} : name === "@google/genai" ? sdk : name === "@/lib/sync/contact-sync-service" ? { prepareActiveClientSync: async () => {}, getUnifiedLeads: async () => [] } : load.call(this, name, parent, main); };
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const { prisma } = require("../src/lib/db/prisma.ts"), { createLeadAnalysis, updateLeadAnalysis } = require("../src/lib/ai/lead-analysis-service.ts");
global.fetch = async () => { throw Error("Live network is forbidden in this test."); };
console.info = () => {};
const marker = `gemini-${Date.now()}`;
async function main() {
  try {
    const org = await prisma.organization.create({ data: { id: marker, name: marker } });
    const client = await prisma.clientAccount.create({ data: { organizationId: org.id, name: marker, brandName: marker } });
    const user = await prisma.user.create({ data: { organizationId: org.id, name: "AI test agent", email: `${marker}@example.test`, role: "AGENT", status: "ACTIVE" } });
    const context = { user, activeClientAccountId: client.id }, input = { transcript: "Ready for a proposal. Our budget is $5,000 for next month." };
    delete process.env.GEMINI_API_KEY;
    const baseline = await createLeadAnalysis(context, input, marker);
    assert.equal(baseline.provider, "RULES_ENGINE"); assert.equal(calls, 0);
    process.env.GEMINI_API_KEY = "fake-gemini-test-key"; responseText = JSON.stringify(valid);
    const ai = await createLeadAnalysis(context, input, marker);
    assert.equal(ai.provider, "GEMINI"); assert.equal(ai.leadScore, 82); assert.equal(ai.summary, valid.summary);
    await createLeadAnalysis(context, { transcript: "Opening discussion. ".repeat(900) + "END_OF_CALL_BUDGET_WITHDRAWN" }, marker);
    assert.ok(lastPrompt.includes("END_OF_CALL_BUDGET_WITHDRAWN"));
    const beforeOversized = calls;
    await assert.rejects(createLeadAnalysis(context, { transcript: "x".repeat(100001) }, marker));
    assert.equal(calls, beforeOversized);
    const corrected = await updateLeadAnalysis(context, ai.id, { summary: "Agent correction", leadScore: 61 }, marker);
    assert.equal(corrected.provider, "GEMINI"); assert.equal(corrected.isManualOverride, true);
    fail = true;
    assert.equal((await createLeadAnalysis(context, input, marker)).provider, "RULES_ENGINE");
    fail = false;
    for (const invalid of ["not JSON", "null", "[]", "{}", JSON.stringify({summary:"Missing qualification fields"}), JSON.stringify({...valid, dealProbability: 150})] ) {
      responseText = invalid;
      assert.equal((await createLeadAnalysis(context, input, marker)).provider, "RULES_ENGINE");
    }
    const before = calls;
    await assert.rejects(createLeadAnalysis(context, { ...input, contactId: "foreign-contact" }, marker));
    await assert.rejects(createLeadAnalysis(context, { ...input, interactionId: "foreign-interaction" }, marker));
    assert.equal(calls, before);
    assert.ok(await prisma.auditLog.findFirst({ where: { organizationId: org.id, entityId: ai.id, action: "LEAD_ANALYSIS_CREATED" } }));
    console.log("PASS Gemini persistence/provenance, manual correction, missing-key fallback, provider failure, invalid output and contact/interaction isolation.");
  } finally { await prisma.organization.deleteMany({ where: { id: marker } }); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
