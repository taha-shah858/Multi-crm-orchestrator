import { TIME_IDLE_MS, type TimeTrackingInput, type TimeTrackingSnapshot, type TrackingReason } from "@/lib/operations/time-tracking-policy";

export interface ActiveTimeState { status: "RUNNING" | "PAUSED" | "IDLE" | "HIDDEN" | "OFFLINE" | "ERROR" | "STARTING"; seconds: number; message?: string; }
interface ControllerOptions {
  clientAccountId: string;
  tabId: string;
  now: () => number;
  available: () => "ACTIVE" | "HIDDEN" | "OFFLINE";
  send: (input: TimeTrackingInput) => Promise<TimeTrackingSnapshot>;
  onChange: (state: ActiveTimeState) => void;
  onSaved: () => void;
  initiallyPaused?: boolean;
  initialSeconds?: number;
}

/** Small, testable browser policy. The server calculates and persists elapsed time. */
export class ActiveTimeController {
  private sequence = 0;
  private lastActivity: number;
  private manuallyPaused: boolean;
  private disposed = false;
  private active = false;
  private state: ActiveTimeState = { status: "STARTING", seconds: 0 };
  private confirmedAt: number;
  private confirmedSeconds = 0;
  private queue: Promise<void> = Promise.resolve();
  private pendingHeartbeat = false;
  private resetNextHeartbeat = false;

  constructor(private readonly options: ControllerOptions) {
    this.lastActivity = this.confirmedAt = options.now();
    this.manuallyPaused = options.initiallyPaused ?? false;
    this.confirmedSeconds = options.initialSeconds ?? 0;
  }
  activity() { this.lastActivity = this.options.now(); }
  restoreTotal(seconds: number) { if (!this.active && !this.disposed) { this.confirmedSeconds = seconds; this.publish(this.state); } }
  setPaused(paused: boolean) { this.manuallyPaused = paused; this.activity(); return this.tick(); }
  getState(): ActiveTimeState {
    const extra = this.state.status === "RUNNING" ? Math.floor(Math.max(0, Math.min(this.options.now() - this.confirmedAt, this.lastActivity + TIME_IDLE_MS - this.confirmedAt)) / 1000) : 0;
    return { ...this.state, seconds: this.confirmedSeconds + extra };
  }
  tick() {
    if (this.disposed) return this.queue;
    const availability = this.options.available();
    const status = this.manuallyPaused ? "PAUSED" : availability === "OFFLINE" ? "OFFLINE" : availability === "HIDDEN" ? "HIDDEN" : this.options.now() - this.lastActivity >= TIME_IDLE_MS ? "IDLE" : "RUNNING";
    if (status !== "RUNNING") {
      this.publish({ ...this.getState(), status });
      if (this.active) return this.pause(status === "PAUSED" ? "MANUAL" : status);
      return this.queue;
    }
    this.active = true;
    return this.submit("HEARTBEAT");
  }
  pause(reason: TrackingReason) {
    this.publish({ ...this.getState(), status: reason === "IDLE" || reason === "HIDDEN" || reason === "OFFLINE" ? reason : "PAUSED" });
    this.active = false;
    return this.submit("PAUSE", reason);
  }
  dispose() {
    // Enqueue the final partial interval; fetch keepalive survives page navigation.
    if (this.active) this.pause("LEAVING");
    this.disposed = true;
    return this.queue;
  }
  private publish(state: ActiveTimeState) {
    this.state = state;
    if (!this.disposed) this.options.onChange(this.getState());
  }
  private submit(action: TimeTrackingInput["action"], reason?: TrackingReason) {
    if (action === "HEARTBEAT" && this.pendingHeartbeat) return this.queue;
    if (action === "HEARTBEAT") this.pendingHeartbeat = true;
    const input: TimeTrackingInput = { action, reason, clientAccountId: this.options.clientAccountId, tabId: this.options.tabId, sequence: ++this.sequence, reset: action === "HEARTBEAT" && this.resetNextHeartbeat };
    if (action === "HEARTBEAT") this.resetNextHeartbeat = false;
    this.queue = this.queue.then(async () => {
      try {
        // A pause queued behind a failed heartbeat cannot credit an uncertain gap.
        if (action === "PAUSE" && this.resetNextHeartbeat) input.reset = true;
        const result = await this.options.send(input);
        if (this.disposed) return;
        if (result.clientAccountId && result.clientAccountId !== this.options.clientAccountId) return;
        this.confirmedSeconds = result.clientTotalSeconds ?? result.trackedSeconds;
        this.confirmedAt = this.options.now();
        if (!result.ignored) this.options.onSaved();
        if (action === "HEARTBEAT" && this.active) this.publish({ status: "RUNNING", seconds: result.trackedSeconds });
        else this.publish({ ...this.state, seconds: result.trackedSeconds });
      } catch (error) {
        this.active = false;
        this.resetNextHeartbeat = true;
        this.publish({ status: "ERROR", seconds: this.confirmedSeconds, message: error instanceof Error ? error.message : "Time could not be saved. Add a manual log if needed." });
      } finally {
        if (action === "HEARTBEAT") this.pendingHeartbeat = false;
      }
    });
    return this.queue;
  }
}
