const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), assert = require("node:assert/strict"), ts = require("typescript");
const { EventEmitter } = require("node:events");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, parent, main, options) { return resolve.call(this, name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name, parent, main, options); };
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const { BrowserCallController } = require("../src/lib/communications/browser-call-controller.ts");
const input = { clientAccountId: "client-a", identityId: "identity-a", phoneNumber: "+923001234567" };
const prepared = { token: "test-only", interactionId: "intent-a", clientAccountId: "client-a", from: "+16592668229", to: input.phoneNumber };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function setup(overrides = {}) {
  const states = [], cancellations = [], counters = { prepares: 0, devices: 0, destroys: 0, disconnects: 0 };
  const call = Object.assign(new EventEmitter(), { status: () => "pending", mute(value) { this.muted = value; }, disconnect() { counters.disconnects++; this.emit("disconnect"); } });
  const device = Object.assign(new EventEmitter(), {
    async connect(options) { assert.deepEqual(options.params, { InteractionId: prepared.interactionId }); return call; },
    disconnectAll() { counters.disconnects++; call.emit("disconnect"); }, destroy() { counters.destroys++; },
  });
  const controller = new BrowserCallController(state => states.push(state), {
    checkMicrophone: async () => {},
    prepare: async () => { counters.prepares++; return prepared; },
    createDevice: async () => { counters.devices++; return device; },
    cancel: async id => { cancellations.push(id); }, ...overrides,
  });
  return { controller, states, cancellations, counters, call, device, last: () => states.at(-1) };
}
async function main() {
  const success = setup();
  await success.controller.start(input);
  assert.equal(success.last().phase, "connecting");
  await success.controller.start(input); assert.equal(success.counters.prepares, 1);
  success.call.emit("ringing"); assert.equal(success.last().phase, "ringing");
  success.call.emit("accept"); assert.equal(success.last().phase, "connected");
  success.controller.toggleMute(); assert.equal(success.call.muted, true); assert.equal(success.last().muted, true);
  success.controller.toggleMute(); assert.equal(success.call.muted, false);
  success.controller.hangUp(); assert.equal(success.last().phase, "ended"); assert.equal(success.counters.destroys, 1);
  success.call.emit("accept"); assert.equal(success.last().phase, "ended");
  assert.deepEqual(success.cancellations, ["intent-a"]);

  const denied = setup({ checkMicrophone: async () => { const error = new Error("Denied"); error.name = "NotAllowedError"; throw error; } });
  await denied.controller.start(input); assert.equal(denied.last().phase, "error");
  assert.match(denied.last().message, /Microphone access was denied/); assert.equal(denied.counters.prepares, 0);

  const pending = deferred();
  const stale = setup({ prepare: () => pending.promise });
  const starting = stale.controller.start(input);
  await new Promise(resolve => setImmediate(resolve));
  stale.controller.dispose(); pending.resolve(prepared); await starting;
  assert.equal(stale.counters.devices, 0); assert.deepEqual(stale.cancellations, ["intent-a"]);
  assert.equal(stale.states.length, 2); // no updates after unmount/client switch

  const creation = deferred();
  const staleDevice = setup({ createDevice: () => creation.promise });
  const creating = staleDevice.controller.start(input);
  await new Promise(resolve => setImmediate(resolve));
  staleDevice.controller.hangUp(); creation.resolve(staleDevice.device); await creating;
  assert.equal(staleDevice.counters.destroys, 1); assert.equal(staleDevice.last().phase, "ended");

  const connection = deferred();
  const staleConnection = setup();
  staleConnection.device.connect = () => connection.promise;
  const connecting = staleConnection.controller.start(input);
  await new Promise(resolve => setImmediate(resolve));
  staleConnection.controller.hangUp(); connection.resolve(staleConnection.call); await connecting;
  assert.equal(staleConnection.counters.destroys, 1); assert.equal(staleConnection.counters.disconnects, 2);
  assert.equal(staleConnection.last().phase, "ended");

  const foreign = setup({ prepare: async () => ({ ...prepared, clientAccountId: "client-b" }) });
  await foreign.controller.start(input); assert.equal(foreign.last().phase, "error");
  assert.equal(foreign.counters.devices, 0); assert.deepEqual(foreign.cancellations, ["intent-a"]);

  const error = setup(); await error.controller.start(input); error.call.emit("error", new Error("Network loss"));
  assert.equal(error.last().phase, "error"); assert.equal(error.counters.destroys, 1);
  const completed = setup(); await completed.controller.start(input); completed.call.emit("disconnect");
  assert.equal(completed.last().phase, "ended"); assert.equal(completed.counters.destroys, 1);
  const connected = setup(); connected.call.status = () => "open"; await connected.controller.start(input);
  assert.equal(connected.last().phase, "connected"); connected.controller.dispose();
  const noConfig = setup({ prepare: async () => { throw new Error("Browser voice is not configured."); } });
  await noConfig.controller.start(input); assert.equal(noConfig.last().phase, "error"); assert.equal(noConfig.counters.devices, 0);
  console.log("PASS browser call lifecycle: permission denial, prepare failure, duplicate click, ringing/answer, mute/unmute, hang-up, remote end, network error, client switch/unmount, late preparation and late device cleanup.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
