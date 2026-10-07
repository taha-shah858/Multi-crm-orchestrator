"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { formatTrackedTime } from "@/lib/operations/time-tracking-policy";

interface EditableLog { id: string; clientAccountId: string; clientName: string; minutes: number; trackedSeconds: number; contactId: string | null; description: string; loggedAt: string; source: string; }
interface Contact { id: string; firstName: string; lastName: string; }
const inputClass = "w-full rounded-lg border border-crm-border bg-crm-bg p-2 text-sm";
function localDate(value: string) { const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }

export default function TimeLedgerEditor({ log, onClose, onSaved }: { log: EditableLog | null; onClose: () => void; onSaved: () => void }) {
  const { activeClientAccount, selectClientAccount } = useClientAccount();
  const [clientId] = useState(log?.clientAccountId ?? activeClientAccount.id);
  const [clientName] = useState(log?.clientName ?? activeClientAccount.name);
  const [description, setDescription] = useState(log?.description ?? "");
  const [minutes, setMinutes] = useState(log ? String(log.minutes) : "");
  const [loggedAt, setLoggedAt] = useState(localDate(log?.loggedAt ?? new Date().toISOString()));
  const [contactId, setContactId] = useState(log?.contactId ?? "");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [working, setWorking] = useState(false); const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(activeClientAccount.id !== clientId);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (activeClientAccount.id !== clientId) { await selectClientAccount(clientId); }
        if (cancelled) return;
        setSelecting(false);
        const response = await fetch("/api/contacts", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        const payload = await response.json();
        if (!cancelled && response.ok && payload.success) setContacts(payload.contacts);
      } catch (err) { if (!cancelled) { setSelecting(false); setError(err instanceof Error ? err.message : "Client could not be selected."); } }
    })();
    return () => { cancelled = true; };
    // Select the log's client once when opening; later switches disable saving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);
  async function save(event: FormEvent) {
    event.preventDefault(); setWorking(true); setError("");
    try {
      if (activeClientAccount.id !== clientId) throw new Error("Select this log's client before saving, or close and reopen the form.");
      const response = await fetch(log ? `/api/time-logs/${encodeURIComponent(log.id)}` : "/api/time-logs", {
        method: log ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, minutes, loggedAt: new Date(loggedAt).toISOString(), ...(!log ? { contactId: contactId || undefined } : {}) }),
        signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "Time log could not be saved.");
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Time log could not be saved."); }
    finally { setWorking(false); }
  }
  return <div className="dashboard-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
    <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="time-log-title" className="w-full max-w-lg space-y-4 rounded-xl border border-crm-border bg-white p-6 text-crm-text shadow-xl">
      <h2 id="time-log-title" className="text-lg font-semibold">{log ? "Correct time log" : "Add manual time log"}</h2>
      <p className="text-sm text-crm-text-muted">Client: {clientName}. Entries and corrections are saved and audited.</p>
      {log?.source === "AUTO" && <p className="text-xs text-crm-text-muted">Measured {formatTrackedTime(log.trackedSeconds)} (minutes:seconds). Your correction changes report totals; the original measurement is retained.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {activeClientAccount.id !== clientId && <p className="text-sm text-amber-700">{selecting ? "Selecting this client…" : "The selected client has changed. Reopen this form to continue."}</p>}
      <label className="grid gap-1 text-sm">Work description<input className={inputClass} required value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label className="grid gap-1 text-sm">Minutes<input className={inputClass} type="number" step="1" min={log?.source === "AUTO" ? 0 : 1} max="1440" required value={minutes} onChange={event => setMinutes(event.target.value)} /></label>
      <label className="grid gap-1 text-sm">When (local time)<input className={inputClass} type="datetime-local" required value={loggedAt} onChange={event => setLoggedAt(event.target.value)} /></label>
      {!log && <label className="grid gap-1 text-sm">Contact (optional)<select className={inputClass} value={contactId} onChange={event => setContactId(event.target.value)}><option value="">Account only</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>)}</select></label>}
      <div className="flex justify-end gap-3"><button type="button" className="rounded-lg border border-crm-border px-4 py-2 text-sm" onClick={onClose} disabled={working}>Cancel</button><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={working || selecting || activeClientAccount.id !== clientId}>{working ? "Saving…" : log ? "Save correction" : "Save time log"}</button></div>
    </form>
  </div>;
}
