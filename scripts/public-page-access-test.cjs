const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
const { NextRequest } = require("next/server");
const filename = path.join(__dirname, "../src/proxy.ts");
const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const proxyModule = { exports: {} };
new Function("require", "module", "exports", source)(require, proxyModule, proxyModule.exports);
function request(route, session = false) {
  return proxyModule.exports.proxy(new NextRequest(`https://example.test${route}`, { headers: session ? { cookie: "multi_crm_session=test" } : {} }));
}
for (const route of ["/home", "/privacy", "/terms", "/login", "/signup"]) assert.equal(request(route).headers.get("location"), null, route);
assert.equal(request("/").headers.get("location"), "https://example.test/home");
assert.equal(request("/", true).headers.get("location"), null);
for (const route of ["/leads", "/calendar", "/admin", "/home/private", "/privacy/private", "/terms/private"]) assert.equal(request(route).headers.get("location"), "https://example.test/login", route);
console.log("PASS: public homepage/privacy/terms, signed-in dashboard, protected routes and public-prefix isolation");
