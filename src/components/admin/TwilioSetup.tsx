"use client";
import { useCallback, useEffect, useState } from "react";
import { readApiJson } from "@/lib/http/client-api";
export default function TwilioSetup() {
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [identities, setIdentities] = useState<Array<{ id: string; label: string; phoneNumber: string; isEnabled: boolean; clientAccount: { name: string } }>>([]);
  const [clientAccountId, setClient] = useState("");
  const [label, setLabel] = useState(""), [phoneNumber, setPhone] = useState("");
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const data = await readApiJson<{ success: true; clients: typeof clients; identities: typeof identities; configured: boolean }>(await fetch("/api/admin/communications"));
    setClients(data.clients); setIdentities(data.identities);
    if (!data.configured) setMessage("Server setup required: Twilio account SID, auth token and public HTTPS URL.");
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load().catch(error => setMessage(error.message)); }, 0); return () => clearTimeout(timer); }, [load]);
  return <section className="rounded border p-5 space-y-3 text-crm-text bg-crm-surface"><h2 className="text-lg font-semibold">Twilio client numbers</h2>
    <p>Assign a Twilio number to one client. Agents can select it in the Smart Dialer.</p>
    <form className="flex flex-wrap gap-3" onSubmit={async event => { event.preventDefault(); setBusy(true); try { await readApiJson(await fetch("/api/admin/communications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientAccountId, label, phoneNumber }) })); await load(); setMessage("Number assigned."); } catch (error) { setMessage(error instanceof Error ? error.message : "Setup failed."); } finally { setBusy(false); } }}>
      <select required aria-label="Client" value={clientAccountId} onChange={event => setClient(event.target.value)}><option value="">Choose client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
      <input required aria-label="Identity label" placeholder="Brand label" value={label} onChange={event => setLabel(event.target.value)} />
      <input required type="tel" aria-label="Twilio number" placeholder="+country code and number" value={phoneNumber} onChange={event => setPhone(event.target.value)} />
      <button disabled={busy} type="submit">{busy ? "Saving…" : "Assign number"}</button>
    </form><p role="status">{message}</p>
    {identities.map(identity => <p key={identity.id}>{identity.clientAccount.name} · {identity.label} · {identity.phoneNumber} · {identity.isEnabled ? "Enabled" : "Disabled"}</p>)}
  </section>;
}
