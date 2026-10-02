"use client";
import { useEffect, useState } from "react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { readApiJson } from "@/lib/http/client-api";
import { MultiCrmCard } from "@/components/ui/MultiCrmCard";
import type { CalendarConnectionSummary, CalendlyEventType, RemoteCalendarProvider } from "@/lib/calendar/calendar-types";

const labels = { GOOGLE: "Google Calendar", OUTLOOK: "Outlook Calendar", CALENDLY: "Calendly" };
export default function CalendarConnectionsPanel({ onConnections, onEventTypes }: { onConnections: (connections: CalendarConnectionSummary[]) => void; onEventTypes: (eventTypes: CalendlyEventType[]) => void }) {
  const { user, activeClientAccount, isClientAccountReady } = useClientAccount();
  const [connections, setConnections] = useState<CalendarConnectionSummary[]>([]);
  const [busy, setBusy] = useState<RemoteCalendarProvider | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    if (!user?.id || !isClientAccountReady) return;
    const abort = new AbortController();
    const load = async () => {
      try {
        const payload = await readApiJson<{ success: true; connections: CalendarConnectionSummary[] }>(await fetch("/api/calendar/connections", { cache: "no-store", signal: abort.signal }));
        if (abort.signal.aborted) return;
        setConnections(payload.connections); onConnections(payload.connections); onEventTypes([]);
        if (new URLSearchParams(window.location.search).has("calendarError")) setNotice("The calendar connection did not finish. Try connecting again.");
        if (payload.connections.some(item => item.provider === "CALENDLY" && item.connected)) {
          const data = await readApiJson<{ success: true; eventTypes: CalendlyEventType[]; error?: string }>(await fetch("/api/calendar/connections/CALENDLY/event-types", { cache: "no-store", signal: abort.signal }));
          if (abort.signal.aborted) return;
          onEventTypes(data.eventTypes); if (data.error) setNotice(data.error);
        }
      } catch (error) { if (!abort.signal.aborted) setNotice(error instanceof Error ? error.message : "Calendar connections could not be loaded."); }
    };
    void load(); return () => abort.abort();
  }, [user?.id, isClientAccountReady, activeClientAccount.id, refreshKey, onConnections, onEventTypes]);
  const act = async (provider: RemoteCalendarProvider, disconnect: boolean) => {
    setBusy(provider); setNotice(null);
    try {
      const data = await readApiJson<{ success: true; authorizationUrl?: string }>(await fetch(`/api/calendar/connections/${provider}/${disconnect ? "disconnect" : "connect"}`, { method: "POST" }));
      if (data.authorizationUrl) window.location.assign(data.authorizationUrl);
      else { setRefreshKey(value => value + 1); setNotice(`${labels[provider]} disconnected. Existing meetings stay in your ledger.`); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Calendar connection failed."); }
    finally { setBusy(null); }
  };
  return <MultiCrmCard className="space-y-3">
    <div><h2 className="text-sm font-semibold">Your calendars</h2><p className="mt-1 text-xs text-crm-text-muted">Connect a calendar to book client meetings. Manual scheduling is always available.</p></div>
    <div className="grid gap-3 md:grid-cols-3">{connections.map(connection => <div key={connection.provider} className="rounded-xl border border-crm-border bg-crm-inner p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{labels[connection.provider]}</span><span className="text-[10px] text-crm-text-muted">{connection.connected ? "Connected" : connection.configured ? "Disconnected" : "Needs setup"}</span></div>{connection.connected && <p className="mt-1 truncate text-[10px] text-crm-text-muted">{connection.accountName}</p>}<button type="button" disabled={Boolean(busy) || (!connection.connected && !connection.configured)} onClick={() => void act(connection.provider, connection.connected)} className="mt-3 rounded-lg border border-crm-border px-3 py-1.5 text-[11px] hover:text-primary-cyan disabled:opacity-40">{busy === connection.provider ? "Working…" : connection.connected ? "Disconnect" : "Connect"}</button></div>)}</div>
    {notice && <p role="status" className="text-xs text-crm-text-muted">{notice}</p>}
  </MultiCrmCard>;
}
