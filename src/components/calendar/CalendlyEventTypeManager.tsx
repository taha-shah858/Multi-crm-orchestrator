"use client";

import { useState, type FormEvent } from "react";
import { readApiJson } from "@/lib/http/client-api";
import type { CalendlyManagedType, CalendlyAvailability } from "@/lib/calendar/calendly-event-types";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const blank = { uri: "", name: "", description: "", duration: 30, active: false };
const field = "w-full rounded-lg border border-crm-border bg-crm-surface p-2 text-xs";
const button = "rounded-lg border border-crm-border px-3 py-2 text-xs disabled:opacity-40";
const endpoint = "/api/calendar/connections/CALENDLY/event-types";

export default function CalendlyEventTypeManager({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CalendlyManagedType[]>([]);
  const [form, setForm] = useState(blank);
  const [availability, setAvailability] = useState<CalendlyAvailability | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [uncertainCreate, setUncertainCreate] = useState(false);
  const refresh = async () => {
    const data = await readApiJson<{ success: true; eventTypes: CalendlyManagedType[] }>(await fetch(`${endpoint}?manage=true`, { cache: "no-store" }));
    setItems(data.eventTypes); setUncertainCreate(false);
  };
  const start = async () => {
    setBusy(true); setNotice(null);
    try { await refresh(); setOpen(true); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Event types could not be loaded."); }
    finally { setBusy(false); }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      const data = await readApiJson<{ success: true; eventType: CalendlyManagedType }>(await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }));
      setForm(data.eventType); setItems(previous => [...previous.filter(item => item.uri !== data.eventType.uri), data.eventType]);
      onSaved(); setNotice("Event type saved in Calendly. Existing bookings keep their current details.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Event type could not be saved.";
      setNotice(message); if (message.includes("may have created")) setUncertainCreate(true);
    } finally { setBusy(false); }
  };
  const loadAvailability = async () => {
    setBusy(true); setNotice(null); setAvailability(null);
    try {
      const data = await readApiJson<{ success: true; availability: CalendlyAvailability }>(await fetch(`/api/calendar/connections/CALENDLY/availability?${new URLSearchParams({ uri: form.uri })}`, { cache: "no-store" }));
      // Keep all provider intervals and date overrides; never invent replacement hours.
      setAvailability({ ...data.availability, rules: [...days.map(day => data.availability.rules.find(rule => rule.type === "wday" && rule.wday === day) ?? { type: "wday" as const, wday: day, intervals: [] }), ...data.availability.rules.filter(rule => rule.type === "date")] });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Availability could not be loaded."); }
    finally { setBusy(false); }
  };
  const saveAvailability = async () => {
    setBusy(true); setNotice(null);
    try {
      await readApiJson(await fetch("/api/calendar/connections/CALENDLY/availability", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ uri: form.uri, ...availability }) }));
      setNotice("Availability saved in Calendly for this event type.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Availability could not be saved."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3 border-t border-crm-border pt-3">
    <button type="button" disabled={busy} onClick={() => void start()} className={button}>Manage Calendly event types</button>
    {notice && <p role="status" className="text-xs text-crm-text-muted">{notice}</p>}
    {open && <div className="space-y-4 rounded-xl border border-crm-border bg-crm-inner p-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Calendly event types</h3><button type="button" disabled={busy} onClick={() => setOpen(false)} className={button}>Close manager</button></div>
      <p className="text-xs text-crm-text-muted">These changes apply to your Calendly account across client accounts. Reconnect Calendly after enabling event-type and availability permissions.</p>
      <div className="flex flex-wrap gap-2"><select aria-label="Manage event type" disabled={busy} value={form.uri} onChange={event => { setForm(items.find(item => item.uri === event.target.value) ?? blank); setAvailability(null); setNotice(null); }} className={`${field} max-w-sm`}><option value="">Create a new event type</option>{items.map(item => <option key={item.uri} value={item.uri}>{item.name} · {item.duration} min{item.active ? "" : " · inactive"}</option>)}</select><button type="button" disabled={busy} onClick={() => void start()} className={button}>Refresh event types</button></div>
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2"><label className="text-xs">Event type name<input required maxLength={200} disabled={busy} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className={field} /></label><label className="text-xs">Duration (minutes)<input type="number" min={1} max={720} required disabled={busy} value={form.duration} onChange={event => setForm({ ...form, duration: Number(event.target.value) })} className={field} /></label></div>
        <label className="block text-xs">Description<textarea maxLength={5000} disabled={busy} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className={field} /></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.active} disabled={busy} onChange={event => setForm({ ...form, active: event.target.checked })} />Active for new bookings</label>
        <p className="text-xs text-crm-text-muted">New types start inactive so you can review their availability before enabling bookings.</p>
        <button disabled={busy || (!form.uri && uncertainCreate)} className={button}>{form.uri ? "Save event type" : "Create event type"}</button>
      </form>
      {form.uri && <div className="space-y-3 border-t border-crm-border pt-3">
        <button type="button" disabled={busy} onClick={() => void loadAvailability()} className={button}>Load availability</button>
        {availability && <><label className="block text-xs">Availability time zone<input disabled={busy} value={availability.timezone} onChange={event => setAvailability({ ...availability, timezone: event.target.value })} className={field} /></label>
          {availability.rules.map((rule, index) => <div key={`${rule.type}-${rule.wday ?? rule.date}`} className="space-y-2 rounded-lg border border-crm-border p-3">
            <span className="text-xs capitalize">{rule.type === "wday" ? rule.wday : `Date override: ${rule.date}`}{!rule.intervals.length ? " · unavailable" : ""}</span>
            {rule.intervals.map((interval, intervalIndex) => <div key={intervalIndex} className="flex flex-wrap items-center gap-2"><input aria-label={`${rule.wday ?? rule.date} start ${intervalIndex + 1}`} type="time" disabled={busy || rule.type === "date"} value={interval.from} onChange={event => setAvailability({ ...availability, rules: availability.rules.map((item, i) => i === index ? { ...item, intervals: item.intervals.map((value, j) => j === intervalIndex ? { ...value, from: event.target.value } : value) } : item) })} className={`${field} max-w-36`} /><span className="text-xs">to</span><input aria-label={`${rule.wday ?? rule.date} end ${intervalIndex + 1}`} type="time" disabled={busy || rule.type === "date"} value={interval.to} onChange={event => setAvailability({ ...availability, rules: availability.rules.map((item, i) => i === index ? { ...item, intervals: item.intervals.map((value, j) => j === intervalIndex ? { ...value, to: event.target.value } : value) } : item) })} className={`${field} max-w-36`} />{rule.type === "wday" && <button type="button" disabled={busy} onClick={() => setAvailability({ ...availability, rules: availability.rules.map((item, i) => i === index ? { ...item, intervals: item.intervals.filter((_, j) => j !== intervalIndex) } : item) })} className={button}>Remove hours</button>}</div>)}
            {rule.type === "wday" && <button type="button" disabled={busy || rule.intervals.length >= 10} onClick={() => setAvailability({ ...availability, rules: availability.rules.map((item, i) => i === index ? { ...item, intervals: [...item.intervals, { from: "09:00", to: "17:00" }] } : item) })} className={button}>Add hours</button>}
          </div>)}
          <p className="text-xs text-crm-text-muted">Date overrides are preserved. Manage those specific dates in Calendly.</p><button type="button" disabled={busy} onClick={() => void saveAvailability()} className={button}>Save availability</button></>}
      </div>}
    </div>}
  </div>;
}
