"use client";
import { useCallback, useEffect, useState } from "react";
import { readApiJson } from "@/lib/http/client-api";

type ConnectionRequest = { id: string; clientAccountId: string; clientAccount: { name: string }; status: string; source: string; expiresAt: string; providerOrganizationId: string | null; providerOrganizationName: string | null; providerUserName: string | null };
type Data = { requests: ConnectionRequest[]; clients: { id: string; name: string }[]; connections: { id: string; clientAccountId: string | null; providerAccountId: string | null; providerAccountName: string | null }[] };
const statusLabels: Record<string, string> = { PENDING: "Invitation ready", AUTHORIZING: "Awaiting Zoho consent", PROCESSING: "Verifying organization", REVIEW: "Needs agency approval", APPROVED: "Approved", REVOKED: "Revoked", FAILED: "Authorization failed", EXPIRED: "Expired" };
export default function ZohoConnectionRequests() {
  const [data, setData] = useState<Data | null>(null);
  const [client, setClient] = useState("");
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Record<string, { identity?: boolean; replacement?: boolean }>>({});
  const load = useCallback(async () => {
    const response = await fetch("/api/integrations/zoho/requests", { cache: "no-store" });
    setData(await readApiJson<Data & { success: true }>(response));
  }, []);
  useEffect(() => { queueMicrotask(() => { void load().catch(reason => setError(reason instanceof Error ? reason.message : "Requests could not be loaded.")); }); }, [load]);
  async function create() {
    if (!client) return;
    setBusy("create"); setError(""); setNotice(""); setLink("");
    try {
      const response = await fetch("/api/integrations/zoho/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientAccountId: client }) });
      const result = await readApiJson<{ success: true; invitationUrl: string }>(response);
      setLink(result.invitationUrl);
      setNotice("Invitation created. Share this link with the client's authorized Zoho representative. It expires in 24 hours.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Invitation could not be created."); }
    finally { setBusy(null); }
  }
  async function action(request: ConnectionRequest, kind: "approve" | "revoke") {
    setBusy(request.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/integrations/zoho/requests/${request.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        action: kind,
        confirmedClientId: confirmation[request.id]?.identity ? request.clientAccountId : undefined,
        confirmedOrganizationId: confirmation[request.id]?.identity ? request.providerOrganizationId : undefined,
        confirmReplacement: confirmation[request.id]?.replacement === true,
      }) });
      await readApiJson(response);
      setNotice(kind === "approve" ? "Verified Zoho connection activated. Refresh Managed Connections above to see its organization name." : "Request revoked. Existing CRM connections were preserved.");
      setConfirmation({});
      setLink("");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The request could not be updated."); }
    finally { setBusy(null); }
  }
  return <section className="my-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6" id="zoho-connection-requests">
    <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Client Zoho authorization</h2><p className="mt-1 text-sm text-slate-600">Invite a client representative to connect from their own browser, then review the verified organization. Agent assignments are managed separately.</p></div>
      <button onClick={() => { setError(""); void load().catch(() => setError("Requests could not be refreshed.")); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Refresh requests</button></div>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}
    <div className="flex flex-wrap items-end gap-3"><label className="min-w-60 flex-1 text-sm text-slate-700">Client account<select value={client} onChange={event => setClient(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 p-2"><option value="">Select a client</option>{data?.clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <button disabled={!client || busy !== null} onClick={() => void create()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Create client invitation</button></div>
    {link && <div className="space-y-2"><label className="block text-sm text-slate-600">Copy and share this private, single-use link<input readOnly value={link} onFocus={event => event.target.select()} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" /></label><button onClick={() => { void navigator.clipboard.writeText(link).then(() => setNotice("Invitation link copied."), () => setError("Select and copy the invitation link from the field above.")); }} className="text-sm text-blue-700">Copy invitation link</button></div>}
    {!data && !error && <p className="text-sm text-slate-500">Loading requests…</p>}
    {data?.requests.length === 0 && <p className="text-sm text-slate-500">No Zoho authorization requests yet.</p>}
    <div className="space-y-3">{data?.requests.map(request => {
      const existing = data.connections.find(connection => connection.clientAccountId === request.clientAccountId);
      const selected = confirmation[request.id] || {};
      const pending = ["PENDING", "AUTHORIZING", "PROCESSING", "REVIEW"].includes(request.status);
      return <article key={request.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium text-slate-900">{request.clientAccount.name}</h3><span className="text-sm text-slate-600">{statusLabels[request.status] || request.status}</span></div>
        {request.providerOrganizationId && <p className="text-sm text-slate-700">Verified organization: <strong>{request.providerOrganizationName}</strong> · ID {request.providerOrganizationId}<br />Authorized by: {request.providerUserName}</p>}
        <p className="text-xs text-slate-500">{request.source === "DIRECT" ? "Direct authorization" : "Client invitation"} · Request expires {new Date(request.expiresAt).toLocaleString()}</p>
        {request.status === "REVIEW" && <>
          <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={selected.identity || false} onChange={event => setConfirmation(previous => ({ ...previous, [request.id]: { ...previous[request.id], identity: event.target.checked } }))} />I confirm that {request.providerOrganizationName} (ID {request.providerOrganizationId}) belongs to {request.clientAccount.name}.</label>
          {existing && <label className="flex items-start gap-2 text-sm text-amber-900"><input type="checkbox" checked={selected.replacement || false} onChange={event => setConfirmation(previous => ({ ...previous, [request.id]: { ...previous[request.id], replacement: event.target.checked } }))} />Replace the existing connection: {existing.providerAccountName || "Unverified Zoho organization"} (ID {existing.providerAccountId || "unknown"}). Organization changes with existing record mappings are blocked.</label>}
          <button disabled={busy !== null || !selected.identity || Boolean(existing && !selected.replacement)} onClick={() => void action(request, "approve")} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Approve verified connection</button>
        </>}
        {pending && <button disabled={busy !== null} onClick={() => void action(request, "revoke")} className="ml-3 text-sm text-red-700 disabled:opacity-50">Revoke request</button>}
      </article>;
    })}</div>
  </section>;
}
