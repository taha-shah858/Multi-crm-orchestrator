"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, PhoneCall, Search, ArrowUpRight, Delete, Headphones } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { readApiJson } from "@/lib/http/client-api";
import BrowserCallControls from "@/components/BrowserCallControls";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const requestVersion = useRef(0);
  const currentClientAccountId = useRef(activeClientAccount.id);

  useEffect(() => {
    currentClientAccountId.current = activeClientAccount.id;
  }, [activeClientAccount.id]);

  const loadGateway = useCallback(async () => {
    if (!isClientAccountReady) return;
    const version = ++requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setIsLoading(true);
    setFeedback(null);
    setIdentities([]);
    setContacts([]);
    setIdentityId("");
    setContactId("");
    setPhoneNumber("");
    setContactSearch("");
    setIsSending(false);

    try {
      const [identityResponse, contactResponse] = await Promise.all([
        fetch("/api/communications/identities", { cache: "no-store" }),
        fetch("/api/contacts", { cache: "no-store" }),
      ]);
      const [identityData, contactData] = await Promise.all([
        readApiJson<{ success: true; identities: CommunicationIdentity[] }>(identityResponse),
        readApiJson<{ success: true; contacts: Contact[] }>(contactResponse),
      ]);
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;

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
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      setIdentities([]);
      setContacts([]);
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "The communication gateway could not be loaded.",
      });
    } finally {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsLoading(false);
    }
  }, [isClientAccountReady, activeClientAccount.id]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadGateway(); }, 0);
    return () => clearTimeout(timer);
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

  const openPhoneApp = async () => {
    if (!identityId || !/^\+[1-9]\d{6,14}$/.test(destination.replace(/[\s().-]/g, ""))) return;
    const version = requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setIsSending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/communications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "CALL",
          mode: "MANUAL",
          identityId,
          contactId: contactId || undefined,
          phoneNumber: contactId ? undefined : phoneNumber,
        }),
      });
      await readApiJson(response);
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      window.location.href = `tel:${destination.replace(/[\s().-]/g, "")}`;
      setFeedback({ tone: "success", text: "Phone-app launch requested and logged. This does not confirm a connected call." });
    } catch (error) {
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "The communication could not be completed.",
      });
    } finally {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsSending(false);
    }
  };

  const numberInput = useRef<HTMLInputElement>(null);
  const validDestination = /^\+[1-9]\d{6,14}$/.test(destination.replace(/[\s().-]/g, ""));
  const editNumber = (key: string) => {
    const field = numberInput.current;
    const start = field?.selectionStart ?? phoneNumber.length;
    const end = field?.selectionEnd ?? start;
    const left = key === "delete" && start === end ? Math.max(0, start - 1) : start;
    const value = phoneNumber.slice(0, left) + (key === "delete" ? "" : key) + phoneNumber.slice(end);
    setPhoneNumber(value);
    setContactId("");
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(left + (key === "delete" ? 0 : key.length), left + (key === "delete" ? 0 : key.length));
    });
  };
  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";
  const keyCls = "flex min-h-16 flex-col items-center justify-center rounded-2xl bg-slate-50 text-slate-900 transition hover:bg-blue-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium tracking-wide text-slate-500">{activeClientAccount.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Smart Dialer</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a contact or dial a number. Talk through your laptop.</p>
        </div>
        <button type="button" onClick={() => void loadGateway()} disabled={isLoading}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
          {isLoading ? "Loading…" : "Refresh contacts"}
        </button>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Building2 className="h-5 w-5" /></span>
              <div><h2 className="font-semibold">Calling identity</h2><p className="text-xs text-slate-500">The client number used for your calls</p></div>
            </div>
            <label htmlFor="calling-identity" className="mb-2 block text-sm font-medium">Call on behalf of</label>
            <select id="calling-identity" value={identityId} onChange={event => setIdentityId(event.target.value)} disabled={isLoading || !identities.length} className={inputCls}>
              {!identities.length && <option value="">{isLoading ? "Loading identities…" : "No number assigned"}</option>}
              {identities.map(identity => <option key={identity.id} value={identity.id}>{identity.label} · {identity.phoneNumber}</option>)}
            </select>
            {selectedIdentity ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">{selectedIdentity.clientAccount.brandName}</span>
              <span className="font-mono text-slate-700">{selectedIdentity.phoneNumber}</span>
            </div> : !isLoading && <p className="mt-3 text-sm text-amber-700">Ask your admin to assign a Twilio number to this client.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Contacts</h2><span className="text-xs text-slate-500">{matchingContacts.length} available</span></div>
            <label htmlFor="contact-search" className="sr-only">Search contacts</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input id="contact-search" value={contactSearch} onChange={event => setContactSearch(event.target.value)} placeholder="Search name, company or phone" className={`${inputCls} pl-10`} />
            </div>
            <div className="mt-4 max-h-96 space-y-1 overflow-y-auto">
              {matchingContacts.map(contact => <button key={contact.id} type="button" disabled={!contact.phone}
                onClick={() => { setContactId(contact.id); setPhoneNumber(contact.phone ?? ""); }}
                aria-pressed={contactId === contact.id}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${contactId === contact.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">{contact.firstName[0]}{contact.lastName[0]}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{contact.firstName} {contact.lastName}</span><span className="block truncate text-xs text-slate-500">{contact.company || contact.email || "Contact"}</span></span>
                <span className="text-xs tabular-nums text-slate-500">{contact.phone || "No phone"}</span>
              </button>)}
              {isLoading && <p className="py-10 text-center text-sm text-slate-500">Loading contacts…</p>}
              {!isLoading && !matchingContacts.length && <div className="py-10 text-center"><p className="text-sm font-medium">{contactSearch ? "No matching contacts" : "No contacts available yet"}</p><p className="mt-1 text-xs text-slate-500">{contactSearch ? "Try another name or use the dialpad." : "You can still call a number using the dialpad."}</p></div>}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><PhoneCall className="h-4 w-4 text-blue-600" /> Dialpad</h2><Headphones className="h-4 w-4 text-slate-400" /></div>
          <label htmlFor="dial-number" className="sr-only">Phone number including country code</label>
          <input ref={numberInput} id="dial-number" type="tel" autoComplete="tel" value={phoneNumber}
            onChange={event => { setPhoneNumber(event.target.value); setContactId(""); }} placeholder="+92 300 1234567"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-2xl font-medium tracking-wide tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <div className="mb-4 mt-2 flex items-center justify-between gap-2 text-xs text-slate-500"><span>Include + and country code</span><button type="button" onClick={() => { setPhoneNumber(""); setContactId(""); numberInput.current?.focus(); }} className="rounded px-1 py-1 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500">Clear</button></div>
          <div className="mb-5 grid grid-cols-3 gap-2" aria-label="Dialpad">
            {[["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["+", ""], ["0", ""], ["delete", ""]].map(([key, letters]) =>
              <button type="button" key={key} aria-label={key === "delete" ? "Delete previous digit" : key === "+" ? "Plus country code prefix" : key}
                onMouseDown={event => event.preventDefault()} onClick={() => editNumber(key)} className={keyCls}>
                {key === "delete" ? <Delete className="h-5 w-5" /> : <><span className="text-2xl font-medium">{key}</span><span aria-hidden="true" className="h-3 text-[9px] tracking-[0.2em] text-slate-400">{letters}</span></>}
              </button>)}
          </div>
          {phoneNumber && !validDestination && <p className="mb-3 text-xs text-amber-700">Enter a complete international number, starting with +.</p>}
          <BrowserCallControls key={`${activeClientAccount.id}:${identityId}`} input={{ clientAccountId: activeClientAccount.id, identityId, contactId: contactId || undefined, phoneNumber: contactId ? undefined : phoneNumber }} destination={destination}
            disabled={isLoading || isSending || !isClientAccountReady || !identityId || !validDestination || selectedIdentity?.provider !== "TWILIO"} />
          <details className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <summary className="cursor-pointer rounded font-medium focus-visible:ring-2 focus-visible:ring-blue-500">Need to use your phone instead?</summary>
            <p className="mt-3 leading-relaxed">Opens an installed phone app and logs the attempt. It uses that app’s phone service and caller ID. The log does not confirm the call connected.</p>
            <button type="button" onClick={() => void openPhoneApp()} disabled={isSending || !identityId || !validDestination}
              className="mt-3 inline-flex items-center gap-1 rounded py-2 font-medium text-slate-700 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">{isSending ? "Opening…" : "Open phone app & log attempt"}<ArrowUpRight className="h-3 w-3" /></button>
          </details>
        </section>
      </div>
      {feedback && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${feedback.tone === "success" ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-700"}`}>{feedback.text}</p>}
    </div>
  );
}
