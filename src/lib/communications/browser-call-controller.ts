import type { Call, Device } from "@twilio/voice-sdk";
import { readApiJson } from "@/lib/http/client-api";

export interface BrowserCallInput {
  clientAccountId: string;
  identityId: string;
  contactId?: string;
  phoneNumber?: string;
}
export interface PreparedBrowserCall {
  token: string;
  interactionId: string;
  clientAccountId: string;
  from: string;
  to: string;
}
export interface BrowserCallState {
  phase: "idle" | "preparing" | "connecting" | "ringing" | "connected" | "ended" | "error";
  muted: boolean;
  message: string;
  from?: string;
  to?: string;
}

// Dependencies are injectable so lifecycle and stale-request handling can be
// exercised without a microphone, a Twilio account, or paid calls.
interface Dependencies {
  checkMicrophone: () => Promise<void>;
  prepare: (input: BrowserCallInput) => Promise<PreparedBrowserCall>;
  createDevice: (token: string) => Promise<Device>;
  cancel: (interactionId: string) => Promise<void>;
}
const defaults: Dependencies = {
  async checkMicrophone() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Laptop calling requires HTTPS (or localhost) and a browser with microphone support.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
  },
  async prepare(input) {
    return readApiJson<PreparedBrowserCall & { success: true }>(await fetch("/api/communications/browser-call", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store",
    }));
  },
  async createDevice(token) {
    const { Device } = await import("@twilio/voice-sdk");
    return new Device(token, { enableImprovedSignalingErrorPrecision: true });
  },
  async cancel(interactionId) {
    const response = await fetch("/api/communications/browser-call", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interactionId }), keepalive: true,
    });
    if (!response.ok) throw new Error("Call preparation could not be canceled.");
  },
};

export class BrowserCallController {
  private generation = 0;
  private device?: Device;
  private call?: Call;
  private interactionId?: string;
  private state: BrowserCallState = { phase: "idle", muted: false, message: "Ready to call using your laptop microphone and speakers/headset." };
  constructor(private listener: ((state: BrowserCallState) => void) | undefined, private deps: Dependencies = defaults) {}

  private publish(patch: Partial<BrowserCallState>) {
    this.state = { ...this.state, ...patch };
    this.listener?.(this.state);
  }
  private release() {
    // Advance first: SDK disconnect events caused by teardown must be ignored.
    this.generation++;
    const device = this.device;
    this.device = undefined;
    this.call = undefined;
    device?.disconnectAll();
    device?.destroy();
    const interactionId = this.interactionId;
    this.interactionId = undefined;
    if (interactionId) void this.deps.cancel(interactionId).catch(() => { /* Unconsumed intents also expire after two minutes. */ });
  }
  async start(input: BrowserCallInput) {
    if (["preparing", "connecting", "ringing", "connected"].includes(this.state.phase)) return;
    const generation = ++this.generation;
    const current = () => generation === this.generation;
    this.publish({ phase: "preparing", muted: false, from: undefined, to: undefined, message: "Requesting microphone access…" });
    try {
      await this.deps.checkMicrophone();
      if (!current()) return;
      this.publish({ message: "Preparing your client’s calling identity…" });
      const prepared = await this.deps.prepare(input);
      if (!current()) { void this.deps.cancel(prepared.interactionId).catch(() => {}); return; }
      this.interactionId = prepared.interactionId;
      if (prepared.clientAccountId !== input.clientAccountId) throw new Error("The active client changed. Choose the recipient again.");
      const device = await this.deps.createDevice(prepared.token);
      if (!current()) { device.destroy(); return; }
      this.device = device;
      const finish = (phase: "ended" | "error", message: string) => {
        if (!current()) return;
        this.release();
        this.publish({ phase, muted: false, message });
      };
      device.on("error", () => finish("error", "The voice connection failed. Check microphone access, network and Twilio configuration. Check the timeline/provider outcome before retrying."));
      this.publish({ phase: "connecting", from: prepared.from, to: prepared.to, message: "Connecting from this laptop…" });
      const call = await device.connect({ params: { InteractionId: prepared.interactionId }, rtcConstraints: { audio: true } });
      if (!current()) { call.disconnect(); return; }
      this.call = call;
      call.on("ringing", () => { if (current()) this.publish({ phase: "ringing", message: "Ringing the recipient…" }); });
      call.on("accept", () => { if (current()) this.publish({ phase: "connected", message: "Connected — speak through your microphone/headset." }); });
      call.on("disconnect", () => finish("ended", "Call ended. Check the timeline for the provider outcome."));
      call.on("cancel", () => finish("ended", "Call canceled."));
      call.on("reject", () => finish("ended", "Call declined."));
      call.on("error", () => finish("error", "The call could not continue. Check the timeline/provider outcome before retrying."));
      // Avoid missing an accept/disconnect that occurred before connect() resolved.
      if (call.status() === "open") this.publish({ phase: "connected", message: "Connected — speak through your microphone/headset." });
      else if (call.status() === "closed") finish("ended", "Call ended. Check the timeline for the provider outcome.");
    } catch (error) {
      if (!current()) return;
      this.release();
      const denied = error instanceof Error && ["NotAllowedError", "PermissionDeniedError"].includes(error.name);
      this.publish({ phase: "error", muted: false, message: denied ? "Microphone access was denied. Allow microphone access in your browser’s site settings, then try again." : error instanceof Error ? error.message : "Could not start the laptop call." });
    }
  }
  toggleMute() {
    if (!this.call || this.state.phase !== "connected") return;
    this.call.mute(!this.state.muted);
    this.publish({ muted: !this.state.muted });
  }
  hangUp() {
    this.release();
    this.publish({ phase: "ended", muted: false, message: "Call ended. Check the timeline for the provider outcome." });
  }
  dispose() { this.listener = undefined; this.release(); }
}
