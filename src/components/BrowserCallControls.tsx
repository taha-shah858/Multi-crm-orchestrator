"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { BrowserCallController, preloadBrowserVoice, type BrowserCallInput, type BrowserCallState } from "@/lib/communications/browser-call-controller";

export default function BrowserCallControls({ input, destination, disabled }: { input: BrowserCallInput; destination: string; disabled: boolean }) {
  const controller = useRef<BrowserCallController | null>(null);
  const [state, setState] = useState<BrowserCallState>({ phase: "idle", muted: false, message: "Use your laptop microphone and speakers/headset. Allow microphone access when prompted." });
  const busy = ["preparing", "connecting", "ringing", "connected"].includes(state.phase);

  useEffect(() => {
    void preloadBrowserVoice().catch(() => {});
    const instance = new BrowserCallController(setState);
    controller.current = instance;
    const unload = () => instance.hangUp();
    window.addEventListener("pagehide", unload);
    return () => {
      instance.dispose();
      controller.current = null;
      window.removeEventListener("pagehide", unload);
    };
  }, []);

  return <div className="space-y-3">
    <p className="text-xs text-slate-500">Destination: <span className="text-slate-900 font-semibold">{busy ? state.to ?? destination : destination || "Choose a contact or enter a number"}</span></p>
    {state.from && busy && <p className="text-xs text-slate-500">Calling from <span className="font-semibold">{state.from}</span></p>}
    <p role="status" aria-live="polite" className={`text-sm ${state.phase === "error" ? "text-red-700" : "text-slate-600"}`}>{state.message}</p>
    <div className="flex flex-wrap gap-3">
      {!busy ? <button type="button" onClick={() => void controller.current?.start(input)} disabled={disabled}
        className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm disabled:opacity-50 cursor-pointer">
        Call
      </button> : <>
        <button type="button" onClick={() => controller.current?.toggleMute()} disabled={state.phase !== "connected"} aria-pressed={state.muted}
          className="flex items-center gap-2 py-2.5 px-4 rounded-lg border border-slate-300 text-sm disabled:opacity-50">
          {state.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}{state.muted ? "Unmute" : "Mute"}
        </button>
        <button type="button" onClick={() => controller.current?.hangUp()} className="flex items-center gap-2 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm">
          <PhoneOff className="w-4 h-4" />{state.phase === "preparing" ? "Cancel" : "Hang up"}
        </button>
      </>}
    </div>
  </div>;
}
