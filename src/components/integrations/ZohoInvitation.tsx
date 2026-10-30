"use client";
import { useEffect, useRef, useState } from "react";
import { readApiJson } from "@/lib/http/client-api";

const regions = [["United States / Global", "https://accounts.zoho.com"], ["Europe", "https://accounts.zoho.eu"], ["India", "https://accounts.zoho.in"], ["Australia", "https://accounts.zoho.com.au"], ["Japan", "https://accounts.zoho.jp"], ["Canada", "https://accounts.zohocloud.ca"], ["China", "https://accounts.zoho.com.cn"], ["Saudi Arabia", "https://accounts.zoho.sa"]];
export default function ZohoInvitation() {
  const token = useRef("");
  const initialized = useRef(false);
  const [details, setDetails] = useState<{ agencyName: string; clientName: string } | null>(null);
  const [message, setMessage] = useState("Checking your invitation…");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [region, setRegion] = useState(regions[0][1]);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const result = new URLSearchParams(window.location.search).get("result");
    token.current = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    window.history.replaceState({}, "", window.location.pathname);
    queueMicrotask(async () => {
      if (result) {
        setMessage(result === "review" ? "Your Zoho organization was verified and submitted to the agency for approval. You can close this page. The agency's existing connection has not been replaced." : "Authorization could not be completed. No connection was changed. Ask the agency for a new invitation and authorize with the intended Zoho account.");
        setError(result !== "review");
        return;
      }
      if (!token.current) { setError(true); setMessage("Open the complete invitation link provided by your agency."); return; }
      try {
        const response = await fetch("/api/zoho-invitation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "inspect", token: token.current }) });
        setDetails(await readApiJson<{ success: true; agencyName: string; clientName: string }>(response));
      } catch (reason) { setError(true); setMessage(reason instanceof Error ? reason.message : "Invitation unavailable."); }
    });
  }, []);
  async function connect() {
    setBusy(true);
    try {
      const response = await fetch("/api/zoho-invitation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "authorize", token: token.current, accountsUrl: region }) });
      const result = await readApiJson<{ success: true; authorizationUrl: string }>(response);
      token.current = "";
      window.location.assign(result.authorizationUrl);
    } catch (reason) { setError(true); setMessage(reason instanceof Error ? reason.message : "Authorization unavailable."); setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12"><section className="w-full max-w-lg space-y-5 rounded-xl border border-slate-200 bg-white p-8">
    <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Multi-CRM Orchestrator</p>
    <h1 className="text-2xl font-semibold text-slate-900">Connect your Zoho organization</h1>
    {details ? <>
      <p className="text-sm leading-6 text-slate-600"><strong>{details.agencyName}</strong> requests CRM access for <strong>{details.clientName}</strong>. Sign into the Zoho account authorized to represent this client. No agency app login is needed.</p>
      <p className="text-sm leading-6 text-slate-600">Zoho will show the requested CRM permissions. Your organization will be verified and reviewed by the agency before the connection is activated.</p>
      <label className="block text-sm text-slate-700">Zoho data center<select className="mt-2 w-full rounded-md border border-slate-300 p-2" value={region} onChange={event => setRegion(event.target.value)}>{regions.map(([name, url]) => <option key={url} value={url}>{name}</option>)}</select></label>
      <button disabled={busy || error} onClick={() => void connect()} className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">{busy ? "Opening Zoho…" : "Continue to Zoho"}</button>
    </> : <p role={error ? "alert" : "status"} className={`text-sm leading-6 ${error ? "text-red-700" : "text-slate-600"}`}>{message}</p>}
    {details && error && <p role="alert" className="text-sm text-red-700">{message}</p>}
  </section></main>;
}
