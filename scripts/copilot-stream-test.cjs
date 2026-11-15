const fs = require("node:fs"), assert = require("node:assert/strict"), ts = require("typescript");
require.extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { streamJsonResponse } = require("../src/lib/http/stream-json.ts");
const { readApiJson } = require("../src/lib/http/client-api.ts");
async function main() {
  let finish;
  const operation = new Promise(resolve => { finish = resolve; });
  const response = streamJsonResponse(() => operation);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.equal(new TextDecoder().decode(first.value), "\n"); // before generation completes
  finish(Response.json({ success: true, analysis: { id: "saved-once", summary: "日本語" } }));
  let body = "";
  while (true) { const chunk = await reader.read(); if (chunk.done) break; body += new TextDecoder().decode(chunk.value); }
  assert.equal(JSON.parse(body).analysis.summary, "日本語");
  const failure = streamJsonResponse(async () => Response.json({ success: false, error: { message: "Gemini timed out." } }, { status: 504 }));
  await assert.rejects(readApiJson(failure), /Gemini timed out/);
  const unexpected = streamJsonResponse(async () => { throw Error("private-provider-details"); });
  const error = await unexpected.json();
  assert.equal(error.success, false); assert.doesNotMatch(JSON.stringify(error), /private-provider-details/);
  let canceledFinish;
  const canceled = streamJsonResponse(() => new Promise(resolve => { canceledFinish = resolve; }));
  await canceled.body.cancel();
  canceledFinish(Response.json({ success: true }));
  await new Promise(resolve => setImmediate(resolve));
  console.log("PASS Copilot JSON streaming: immediate first byte, completed saved result, UTF-8, actionable error envelope, sanitized unexpected failure and safe cancellation.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
