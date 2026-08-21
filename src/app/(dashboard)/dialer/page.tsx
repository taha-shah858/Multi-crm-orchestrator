"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MessageSquare, PhoneCall, Search, ShieldCheck, User } from "lucide-react";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useClientAccount } from "@/context/ClientAccountContext";

interface CommunicationIdentity {
  id: string;
  provider: "TWILIO" | "MOCK";
  label: string;
  phoneNumber: string;
  isDefault: boolean;
  clientAccount: { name: string; brandName: string };
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  company: string | null;
}

export default function SmartDialerPage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [identities, setIdentities] = useState<CommunicationIdentity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [identityId, setIdentityId] = useState("");
  const [contactId, setContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadGateway = useCallback(async () => {
    if (!isClientAccountReady) return;
    setIsLoading(true);
    setFeedback(null);

    try {
      const [identityResponse, contactResponse] = await Promise.all([
        fetch("/api/communications/identities", { cache: "no-store" }),
        fetch("/api/contacts", { cache: "no-store" }),
      ]);
      const [identityData, contactData] = await Promise.all([
        identityResponse.json(),
        contactResponse.json(),
      ]);

      if (!identityResponse.ok || !identityData.success) {
        throw new Error(identityData?.error?.message ?? "Outgoing identities could not be loaded.");
      }
      if (!contactResponse.ok || !contactData.success) {
        throw new Error(contactData?.error?.message ?? "Contacts could not be loaded.");
      }

      const availableIdentities = identityData.identities as CommunicationIdentity[];
      setIdentities(availableIdentities);
      setContacts(contactData.contacts as Contact[]);
      setIdentityId((current) =>
        availableIdentities.some((identity) => identity.id === current)
          ? current
          : availableIdentities.find((identity) => identity.isDefault)?.id ?? availableIdentities[0]?.id ?? "",
      );
      setContactId("");
      setPhoneNumber("");
      setContactSearch("");
    } catch (error) {
      setIdentities([]);
      setContacts([]);
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "The communication gateway could not be loaded.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isClientAccountReady, activeClientAccount.id]);

  useEffect(() => {
    void loadGateway();
  }, [loadGateway]);

  const selectedIdentity = identities.find((identity) => identity.id === identityId);
  const selectedContact = contacts.find((contact) => contact.id === contactId);
  const destination = selectedContact?.phone ?? phoneNumber;
  const matchingContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      [contact.firstName, contact.lastName, contact.phone, contact.email, contact.company]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [contactSearch, contacts]);

  const dispatch = async (kind: "CALL" | "SMS", mode: "AUTOMATED" | "MANUAL") => {
    if (!identityId || !destination || (kind === "SMS" && !smsBody.trim())) return;
    setIsSending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/communications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          mode,
          identityId,
          contactId: contactId || undefined,
          phoneNumber: contactId ? undefined : phoneNumber,
          body: smsBody,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message ?? "The communication could not be recorded.");
      }

      if (kind === "CALL" && mode === "MANUAL") {
        window.location.href = `tel:${destination}`;
      }
      if (kind === "SMS" && mode === "MANUAL") {
        window.location.href = `sms:${destination}?body=${encodeURIComponent(smsBody)}`;
      }
      setFeedback({
        tone: "success",
        text: mode === "MANUAL"
          ? `${kind === "CALL" ? "Manual dial" : "Manual SMS"} opened and the interaction was logged.`
          : `${kind === "CALL" ? "Call" : "SMS"} dispatched through ${data.delivery.provider}; the interaction is in the unified timeline.`,
      });
      if (kind === "SMS") setSmsBody("");
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "The communication could not be completed.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 text-crm-text font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight">Smart Dialer</h1>
          </div>
          <p className="text-xs text-crm-text-muted font-mono mt-1">
            Client-scoped calling and SMS with a visible, brand-safe outgoing identity.
          </p>
        </div>
        <MultiCrmTag variant="cyan">
          <Building2 className="w-3.5 h-3.5 mr-1" /> {activeClientAccount.name}
        </MultiCrmTag>
      </div>

      <MultiCrmCard className="p-4 border-primary-cyan/30">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary-cyan/10 border border-primary-cyan/30">
            <ShieldCheck className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">Active client and brand</p>
            <p className="text-sm font-bold">{activeClientAccount.brandName} · {activeClientAccount.name}</p>
            <p className="text-xs text-crm-text-muted mt-0.5">Confirm the outgoing identity below before communicating.</p>
          </div>
          <button onClick={() => void loadGateway()} disabled={isLoading} className="px-3 py-2 rounded-xl bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text-muted hover:text-crm-text disabled:opacity-50 cursor-pointer">
            {isLoading ? "Loading…" : "Refresh gateway"}
          </button>
        </div>
      </MultiCrmCard>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <MultiCrmCard className="xl:col-span-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-crm-border-strong pb-3">
            <PhoneCall className="w-4 h-4 text-primary-cyan" />
            <h2 className="text-sm font-semibold">Communication identity</h2>
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            <label className="text-[10px] text-crm-text-muted">Outgoing identity · manual override</label>
            <select value={identityId} onChange={(event) => setIdentityId(event.target.value)} disabled={isLoading || !identities.length} className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2.5 text-crm-text focus:outline-none focus:border-primary-cyan disabled:opacity-50">
              {identities.map((identity) => (
                <option key={identity.id} value={identity.id}>{identity.label} · {identity.phoneNumber}</option>
              ))}
            </select>
          </div>
          {selectedIdentity ? (
            <MultiCrmInnerPanel className="p-4 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between"><span className="text-crm-text-muted">Brand</span><span className="font-bold">{selectedIdentity.clientAccount.brandName}</span></div>
              <div className="flex items-center justify-between"><span className="text-crm-text-muted">Sending number</span><span className="text-primary-cyan font-semibold">{selectedIdentity.phoneNumber}</span></div>
              <div className="flex items-center justify-between"><span className="text-crm-text-muted">Provider</span><MultiCrmTag variant={selectedIdentity.provider === "TWILIO" ? "cyan" : "neutral"}>{selectedIdentity.provider}</MultiCrmTag></div>
            </MultiCrmInnerPanel>
          ) : <p className="text-xs text-amber-400">No enabled identity is available for this client account.</p>}
          <p className="text-[11px] leading-relaxed text-crm-text-muted">Automatic dispatch uses Twilio only when that identity and its server-side credentials are configured. The manual options always remain available.</p>
        </MultiCrmCard>

        <MultiCrmCard className="xl:col-span-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-crm-border-strong pb-3">
            <User className="w-4 h-4 text-primary-cyan" />
            <h2 className="text-sm font-semibold">Choose recipient</h2>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-crm-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Search active-client contacts by name, phone, email, or company…" className="w-full bg-crm-inner border border-crm-border-strong rounded-xl pl-9 pr-3 py-2.5 text-xs text-crm-text placeholder-slate-500 focus:outline-none focus:border-primary-cyan" />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {matchingContacts.map((contact) => (
              <button key={contact.id} type="button" onClick={() => { setContactId(contact.id); setPhoneNumber(contact.phone ?? ""); }} className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${contactId === contact.id ? "border-primary-cyan/50 bg-primary-cyan/10" : "border-crm-border-strong bg-crm-inner hover:border-primary-cyan/30"}`}>
                <span className="block text-xs font-semibold">{contact.firstName} {contact.lastName}</span>
                <span className="block mt-0.5 text-[10px] font-mono text-crm-text-muted">{[contact.phone, contact.email, contact.company].filter(Boolean).join(" · ") || "No phone on record"}</span>
              </button>
            ))}
            {!isLoading && !matchingContacts.length && <p className="py-4 text-center text-xs text-crm-text-muted">No contacts match this active client account.</p>}
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            <label className="text-[10px] text-crm-text-muted">Or enter a number manually</label>
            <input value={phoneNumber} onChange={(event) => { setPhoneNumber(event.target.value); setContactId(""); }} placeholder="+1 555 010 1234" className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2.5 text-crm-text focus:outline-none focus:border-primary-cyan" />
          </div>
        </MultiCrmCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MultiCrmCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-crm-border-strong pb-3"><PhoneCall className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-semibold">Call</h2></div>
          <p className="text-xs text-crm-text-muted">Destination: <span className="text-crm-text font-mono">{destination || "Choose a contact or enter a number"}</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => void dispatch("CALL", "AUTOMATED")} disabled={isSending || !identityId || !destination} className="py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 disabled:opacity-50 cursor-pointer">{isSending ? "Sending…" : "Call through gateway"}</button>
            <button onClick={() => void dispatch("CALL", "MANUAL")} disabled={isSending || !identityId || !destination} className="py-3 rounded-xl bg-crm-inner border border-primary-cyan/40 text-primary-cyan font-bold text-xs hover:bg-primary-cyan/10 disabled:opacity-50 cursor-pointer">Dial manually & log</button>
          </div>
        </MultiCrmCard>

        <MultiCrmCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-crm-border-strong pb-3"><MessageSquare className="w-4 h-4 text-primary-cyan" /><h2 className="text-sm font-semibold">SMS</h2></div>
          <textarea value={smsBody} onChange={(event) => setSmsBody(event.target.value)} rows={3} placeholder="Write a client-approved message…" className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-3 text-xs text-crm-text placeholder-slate-500 focus:outline-none focus:border-primary-cyan" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => void dispatch("SMS", "AUTOMATED")} disabled={isSending || !identityId || !destination || !smsBody.trim()} className="py-3 rounded-xl bg-primary-cyan text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-50 cursor-pointer">Send through gateway</button>
            <button onClick={() => void dispatch("SMS", "MANUAL")} disabled={isSending || !identityId || !destination || !smsBody.trim()} className="py-3 rounded-xl bg-crm-inner border border-primary-cyan/40 text-primary-cyan font-bold text-xs hover:bg-primary-cyan/10 disabled:opacity-50 cursor-pointer">Open manual SMS & log</button>
          </div>
        </MultiCrmCard>
      </div>

      {feedback && <p role="status" className={`rounded-xl border px-4 py-3 text-xs font-mono ${feedback.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>{feedback.text}</p>}
    </div>
  );
}
