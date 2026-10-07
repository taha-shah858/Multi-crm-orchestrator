"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Pause, Play, Square } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { ActiveTimeController, type ActiveTimeState } from "@/lib/operations/active-time-controller";
import { TIME_HEARTBEAT_MS, TIME_IDLE_MS, formatTrackedTime } from "@/lib/operations/time-tracking-policy";

export const TIME_LOG_UPDATED_EVENT = "crm:time-log-updated";
export default function ActiveTimeTracker() {
  const { user, activeClientAccount, isClientAccountReady } = useClientAccount();
  const controller = useRef<ActiveTimeController | null>(null);
  const [state, setState] = useState<ActiveTimeState>({ status: "STARTING", seconds: 0 });
  const [paused, setPaused] = useState(false);
  const [stopping, setStopping] = useState(false);
  const pausedPreference = useRef(false);
  const transition = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!isClientAccountReady || !activeClientAccount.id || user?.role !== "AGENT") return;
    const preferenceKey = `crm:time-paused:${user.id}`;
    const clientId = activeClientAccount.id;
    let idleTimeout: ReturnType<typeof setTimeout>;
    let ready = false;
    let cancelled = false;
    try { pausedPreference.current = localStorage.getItem(preferenceKey) === "true"; } catch { /* Tracking still works without storage. */ }
    const tracker = new ActiveTimeController({
      clientAccountId: clientId, tabId: crypto.randomUUID(), now: Date.now,
      initiallyPaused: pausedPreference.current,
      available: () => !navigator.onLine ? "OFFLINE" : document.visibilityState !== "visible" || !document.hasFocus() ? "HIDDEN" : "ACTIVE",
      send: async input => {
        const abort = new AbortController();
        const timeout = setTimeout(() => abort.abort(), 10_000);
        try {
          const response = await fetch("/api/time-tracking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), keepalive: true, signal: abort.signal });
          const payload = await response.json();
          if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Time could not be saved. Add a manual log if needed.");
          return payload.tracking;
        } finally { clearTimeout(timeout); }
      },
      onChange: next => { setState(next); setPaused(pausedPreference.current); },
      onSaved: () => window.dispatchEvent(new CustomEvent(TIME_LOG_UPDATED_EVENT, { detail: { clientAccountId: clientId } })),
    });
    controller.current = tracker;
    const scheduleIdle = () => { clearTimeout(idleTimeout); idleTimeout = setTimeout(() => void tracker.tick(), TIME_IDLE_MS); };
    const activity = () => { tracker.activity(); scheduleIdle(); if (ready && tracker.getState().status !== "RUNNING") void tracker.tick(); };
    const visibility = () => { if (document.visibilityState === "visible" && document.hasFocus()) activity(); else if (ready) void tracker.tick(); };
    const leave = () => { void tracker.pause("LEAVING"); };
    const ledgerChanged = () => {
      if (!ready || cancelled) return;
      if (tracker.getState().status === "RUNNING") { void tracker.tick(); return; }
      void fetch("/api/time-tracking", { cache: "no-store", signal: AbortSignal.timeout(10000) }).then(async response => {
        const payload = await response.json();
        if (!cancelled && response.ok && payload.clientAccountId === clientId) tracker.restoreTotal(payload.clientTotalSeconds);
      }).catch(() => { /* A later heartbeat or reload retries the saved total. */ });
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== preferenceKey) return;
      pausedPreference.current = event.newValue === "true";
      void tracker.setPaused(pausedPreference.current);
    };
    const activityEvents = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    for (const event of activityEvents) window.addEventListener(event, activity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("focus", visibility);
    window.addEventListener("blur", visibility);
    window.addEventListener("online", activity);
    window.addEventListener("offline", visibility);
    window.addEventListener("pagehide", leave);
    window.addEventListener("storage", storage);
    window.addEventListener("crm:time-ledger-changed", ledgerChanged);
    scheduleIdle();
    // Callback runs asynchronously so subscribing does not synchronously set React state.
    const previousStop = transition.current;
    queueMicrotask(() => setState({ status: "STARTING", seconds: 0 }));
    void previousStop.then(async () => {
      if (cancelled) return;
      try {
        const response = await fetch("/api/time-tracking", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        const payload = await response.json();
        if (!cancelled && response.ok && payload.clientAccountId === clientId) tracker.restoreTotal(payload.clientTotalSeconds);
      } catch { /* Heartbeat retries still retrieve the persisted total. */ }
      if (cancelled) return;
      ready = true;
      await tracker.tick();
    });
    const heartbeat = setInterval(() => { if (ready) void tracker.tick(); }, TIME_HEARTBEAT_MS);
    const display = setInterval(() => { if (ready) setState(tracker.getState()); }, 1000);
    return () => {
      cancelled = true;
      transition.current = previousStop.then(() => tracker.dispose());
      controller.current = null;
      clearTimeout(idleTimeout); clearInterval(heartbeat); clearInterval(display);
      for (const event of activityEvents) window.removeEventListener(event, activity, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("focus", visibility); window.removeEventListener("blur", visibility);
      window.removeEventListener("online", activity); window.removeEventListener("offline", visibility);
      window.removeEventListener("pagehide", leave); window.removeEventListener("storage", storage);
      window.removeEventListener("crm:time-ledger-changed", ledgerChanged);
    };
  }, [user?.id, user?.role, activeClientAccount.id, isClientAccountReady]);

  if (!isClientAccountReady || user?.role !== "AGENT" || !activeClientAccount.id) return null;
  const labels = { STARTING: "Starting", RUNNING: "Active", PAUSED: "Paused", IDLE: "Idle", HIDDEN: "Paused", OFFLINE: "Offline", ERROR: "Time unsaved" };
  return <div className="flex items-center gap-2" title={state.message ?? `Tracks active work for ${activeClientAccount.name}. Pauses after two minutes of inactivity or when this tab loses focus.`}>
    <Clock3 className={`h-3.5 w-3.5 ${state.status === "RUNNING" ? "text-emerald-400" : "text-crm-text-muted"}`} />
    <span className="whitespace-nowrap text-[11px] font-mono" role="status">{labels[state.status]} · {formatTrackedTime(state.seconds)}</span>
    <span className="whitespace-nowrap text-[10px] text-crm-text-muted" title="Current work session; Stop saves it and starts a new session. Client totals are preserved.">Session {formatTrackedTime(state.sessionSeconds ?? 0)}</span>
    <button type="button" aria-label={paused ? "Resume automatic time tracking" : "Pause automatic time tracking"} onClick={() => {
      const next = !pausedPreference.current;
      pausedPreference.current = next; setPaused(next);
      try { localStorage.setItem(`crm:time-paused:${user.id}`, String(next)); } catch { /* Preference applies in this tab. */ }
      void controller.current?.setPaused(next);
    }} disabled={stopping || state.status === "STARTING"} className="rounded-md border border-crm-border p-1.5 text-crm-text-muted hover:text-primary-cyan">{paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}</button>
    <button type="button" aria-label="Stop and save current time session" title="Save current time and start a new session. Client totals stay saved." disabled={stopping || state.status === "STARTING"} onClick={async () => {
      const tracker = controller.current;
      if (!tracker) return;
      setStopping(true);
      try {
        await tracker.stopAndRestart();
        if (controller.current === tracker && tracker.getState().status !== "ERROR") {
          pausedPreference.current = false; setPaused(false);
          try { localStorage.setItem(`crm:time-paused:${user.id}`, "false"); } catch { /* Current tab still resumes. */ }
        }
      } finally { setStopping(false); }
    }} className="rounded-md border border-crm-border p-1.5 text-crm-text-muted hover:text-primary-cyan"><Square className="h-3 w-3" /></button>
  </div>;
}
