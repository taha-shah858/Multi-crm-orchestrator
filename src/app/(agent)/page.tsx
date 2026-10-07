"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, Calendar, CheckCircle2, Layers, PhoneCall, RefreshCw, Sparkles, Users } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { MultiCrmCard } from "@/components/ui/MultiCrmCard";
import { readApiJson } from "@/lib/http/client-api";

interface Dashboard {
  success: boolean;
  updatedAt: string;
  clients: { id: string; name: string }[];
  metrics: { agencyLeads: number; callsToday: number; analyses: number; closedDeals: number };
  connections: { id: string; provider: string; ownershipType: string; status: string; lastSyncAt: string | null; clientAccount: { name: string } | null }[];
  calendars: { id: string; provider: string; status: string }[];
  appointments: { id: string; title: string; startTime: string; provider: string; calendarSyncStatus: string; clientAccount: { name: string } }[];
  interactions: { id: string; subject: string | null; type: string; source: string; occurredAt: string; clientAccount: { name: string } }[];
}
const date = (value: string) => new Date(value).toLocaleString();
const label = (value: string) => value.replaceAll("_", " ").toLowerCase();
const button = "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50";
function Status({ value }: { value: string }) {
  const healthy = ["CONNECTED", "SYNCED", "LOCAL_ONLY"].includes(value);
  return <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${healthy ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{label(value)}</span>;
}
export default function HomeDashboard() {
  const { user, activeClientAccount } = useClientAccount();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const payload = await readApiJson<Dashboard>(await fetch("/api/agent-dashboard", { cache: "no-store", signal: controller.signal }));
        if (!controller.signal.aborted) setData(payload);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Your dashboard could not be loaded.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [refreshKey, activeClientAccount.id]);
  const metrics = [
    { title: "Unified agency leads", value: data?.metrics.agencyLeads, note: "Saved HubSpot directory · shared across clients", icon: Users, href: "/leads" },
    { title: "Your calls today", value: data?.metrics.callsToday, note: "Recorded outgoing calls · today in UTC", icon: PhoneCall, href: "/timeline" },
    { title: "Your lead analyses", value: data?.metrics.analyses, note: "Saved analyses · all assigned clients", icon: Sparkles, href: "/copilot" },
    { title: "Your closed deals", value: data?.metrics.closedDeals, note: "Closed won · all assigned clients", icon: CheckCircle2, href: "/operations" },
  ];
  return <div className="space-y-6 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><Activity className="h-6 w-6 text-blue-500" />Your operations hub</h1><p className="mt-2 text-sm text-slate-600">{user ? `Welcome, ${user.name}. ` : ""}Saved activity across your assigned clients.</p></div>
      <div className="flex gap-2"><Link className={button} href="/integrations">Manage integrations<ArrowUpRight className="h-4 w-4" /></Link><button className={button} disabled={loading} onClick={() => setRefreshKey(value => value + 1)}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Refreshing…" : "Refresh"}</button></div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 p-4 text-sm text-red-500">{error}{data && " Showing your last loaded data."}</p>}
    {data && <p className="text-xs text-slate-600">Updated {date(data.updatedAt)} · {data.clients.length} assigned client{data.clients.length === 1 ? "" : "s"}. Refresh reads saved data; use Integrations to synchronize a provider.</p>}
    {data?.clients.length === 0 && <MultiCrmCard className="p-5"><h2 className="font-semibold">Waiting for client assignment</h2><p className="mt-2 text-sm text-slate-600">Your account is ready. Your administrator needs to assign a client account before you can work with agency leads and client data.</p></MultiCrmCard>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Saved workspace metrics">{metrics.map(metric => <Link key={metric.title} href={metric.href}><MultiCrmCard className="h-full p-5"><div className="flex items-center justify-between text-sm text-slate-600"><span>{metric.title}</span><metric.icon className="h-5 w-5 text-blue-500" /></div><p className="my-3 text-3xl font-semibold">{metric.value?.toLocaleString() ?? (loading ? "…" : "—")}</p><p className="text-xs text-slate-600">{metric.note}</p></MultiCrmCard></Link>)}</section>
    <div className="grid gap-5 xl:grid-cols-2">
      <MultiCrmCard className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Layers className="h-5 w-5" />CRM connections</h2><Link className="text-sm text-blue-500" href="/integrations">Manage</Link></div><p className="mb-4 text-xs text-slate-600">HubSpot: agency · Zoho: assigned clients · ClickUp: your account.</p>
        {data?.connections.map(connection => <div key={connection.id} className="flex items-center justify-between gap-3 border-t border-slate-200 py-3"><div><p className="text-sm font-medium">{connection.provider}</p><p className="mt-1 text-xs text-slate-600">{connection.clientAccount?.name ?? (connection.ownershipType === "COMPANY" ? "Agency" : "Your account")}</p><p className="mt-1 text-xs text-slate-600">{connection.lastSyncAt ? `Last sync ${date(connection.lastSyncAt)}` : "No completed sync recorded"}</p></div><Status value={connection.status} /></div>)}
        {!data?.connections.length && <p className="py-4 text-sm text-slate-600">{loading ? "Loading connections…" : "No CRM connections available. Open Integrations to connect your account or ask your administrator."}</p>}
      </MultiCrmCard>
      <MultiCrmCard className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Calendar className="h-5 w-5" />Upcoming meetings</h2><Link className="text-sm text-blue-500" href="/calendar">Calendar Planner</Link></div>
        <div className="mb-3 flex flex-wrap gap-2">{data?.calendars.map(calendar => <span key={calendar.id} className="inline-flex items-center gap-2 text-xs">{calendar.provider}<Status value={calendar.status} /></span>)}</div>
        {data?.appointments.map(appointment => <div key={appointment.id} className="flex items-center justify-between gap-3 border-t border-slate-200 py-3"><div><p className="text-sm font-medium">{appointment.title}</p><p className="mt-1 text-xs text-slate-600">{date(appointment.startTime)} · {appointment.clientAccount.name} · {appointment.provider}</p></div><Status value={appointment.calendarSyncStatus} /></div>)}
        {!data?.appointments.length && <p className="py-4 text-sm text-slate-600">{loading ? "Loading meetings…" : "No upcoming saved meetings."}</p>}
      </MultiCrmCard>
    </div>
    <MultiCrmCard className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Your recent interactions</h2><Link className="text-sm text-blue-500" href="/timeline">Open timeline</Link></div>{data?.interactions.map(interaction => <div key={interaction.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-3"><div><p className="text-sm font-medium">{interaction.subject || label(interaction.type)}</p><p className="mt-1 text-xs text-slate-600">{interaction.clientAccount.name} · {interaction.type} · {interaction.source}</p></div><time className="text-xs text-slate-600">{date(interaction.occurredAt)}</time></div>)}{!data?.interactions.length && <p className="py-4 text-sm text-slate-600">{loading ? "Loading interactions…" : "No saved interactions yet. Log an interaction in the timeline or use the dialer."}</p>}</MultiCrmCard>
    <nav className="flex flex-wrap gap-3" aria-label="Workspace shortcuts"><Link className={button} href="/leads">Unified Lead Directory</Link><Link className={button} href="/dialer">Dialer & messages</Link><Link className={button} href="/time-audit">Time Audit</Link><Link className={button} href="/operations">Sales Operations</Link><Link className={button} href="/documents">Documents</Link></nav>
  </div>;
}
