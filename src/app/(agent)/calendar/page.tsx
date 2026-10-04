"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Calendar as CalendarIcon, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Edit3, Plus, Sparkles, X } from "lucide-react";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useClientAccount } from "@/context/ClientAccountContext";
import { readApiJson } from "@/lib/http/client-api";

type Provider = "MANUAL" | "MOCK";
type Status = "SCHEDULED" | "CONFIRMED" | "CANCELLED";
type View = "WEEK" | "DAY" | "MONTH";

interface Contact { id: string; firstName: string; lastName: string; company: string | null; }
interface Appointment { id: string; title: string; description: string | null; startTime: string; endTime: string; status: Status; provider: Provider; source: "MANUAL" | "INTENT_DETECTED"; intentDetected: boolean; contact: Contact | null; interaction: { id: string; subject: string | null; occurredAt: string } | null; }
interface Intent { id: string; contactId: string | null; subject: string | null; body: string; occurredAt: string; contact: Contact | null; reason: string; }
interface FormValues { title: string; description: string; contactId: string; interactionId: string; startTime: string; endTime: string; provider: Provider; status: Status; }

const blankForm = (): FormValues => ({ title: "", description: "", contactId: "", interactionId: "", startTime: "", endTime: "", provider: "MANUAL", status: "SCHEDULED" });
const localDateTime = (value: string) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
const displayTime = (value: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
const displayDateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const contactName = (contact: Contact | null) => contact ? `${contact.firstName} ${contact.lastName}` : "Account-level meeting";
const sameDay = (one: Date, two: Date) => one.getFullYear() === two.getFullYear() && one.getMonth() === two.getMonth() && one.getDate() === two.getDate();
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const startOfWeek = (date: Date) => addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -date.getDay());
const startOfMonthGrid = (date: Date) => startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
const statusClass = (status: Status) =>
  status === "CONFIRMED"
    ? "bg-blue-50 border-blue-200 text-blue-800"
    : status === "CANCELLED"
    ? "bg-slate-100 border-slate-200 text-slate-400 line-through"
    : "bg-amber-50 border-amber-200 text-amber-800";

export default function CalendarPage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [view, setView] = useState<View>("WEEK");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<FormValues>(blankForm());
  const [contactSearch, setContactSearch] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const requestVersion = useRef(0);
  const currentClientId = useRef(activeClientAccount.id);
  currentClientId.current = activeClientAccount.id;

  useEffect(() => {
    if (!isClientAccountReady) return;
    const controller = new AbortController();
    const version = ++requestVersion.current;
    const clientId = activeClientAccount.id;
    setIsLoading(true);
    setAppointments([]);
    setIntents([]);
    setContacts([]);
    setMessage(null);
    setIsModalOpen(false);
    setEditing(null);

    const load = async () => {
      try {
        const [calendarResponse, contactsResponse] = await Promise.all([
          fetch("/api/calendar/events", { cache: "no-store", signal: controller.signal }),
          fetch("/api/contacts", { cache: "no-store", signal: controller.signal }),
        ]);
        const [calendar, contactsPayload] = await Promise.all([
          readApiJson<{ success: true; appointments: Appointment[]; intents: Intent[] }>(calendarResponse),
          readApiJson<{ success: true; contacts: Contact[] }>(contactsResponse),
        ]);
        if (controller.signal.aborted || version !== requestVersion.current || currentClientId.current !== clientId) return;
        setAppointments(calendar.appointments);
        setIntents(calendar.intents);
        setContacts(contactsPayload.contacts);
      } catch (error) {
        if (controller.signal.aborted || version !== requestVersion.current || currentClientId.current !== clientId) return;
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "The calendar could not be loaded." });
      } finally {
        if (!controller.signal.aborted && version === requestVersion.current && currentClientId.current === clientId) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [activeClientAccount.id, isClientAccountReady]);

  const visibleAppointments = useMemo(
    () => appointments.filter((appointment) => statusFilter === "ALL" || appointment.status === statusFilter),
    [appointments, statusFilter]
  );
  const weekDays = useMemo(
    () => Array.from({ length: view === "DAY" ? 1 : 7 }, (_, index) => addDays(view === "DAY" ? focusDate : startOfWeek(focusDate), index)),
    [focusDate, view]
  );
  const monthDays = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(startOfMonthGrid(focusDate), index)),
    [focusDate]
  );
  const selectedContact = contacts.find((contact) => contact.id === form.contactId) ?? null;
  const filteredContacts = contacts.filter((contact) => `${contact.firstName} ${contact.lastName} ${contact.company ?? ""}`.toLowerCase().includes(contactSearch.toLowerCase())).slice(0, 6);

  const openCreate = (intent?: Intent, selectedSlot?: Date) => {
    const start = selectedSlot ?? new Date();
    start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30, 0, 0);
    const end = new Date(start.getTime() + 30 * 60_000);
    setEditing(null);
    setContactSearch("");
    setForm({
      ...blankForm(),
      title: intent?.contact ? `Meeting with ${contactName(intent.contact)}` : "",
      contactId: intent?.contactId ?? "",
      interactionId: intent?.id ?? "",
      startTime: localDateTime(start.toISOString()),
      endTime: localDateTime(end.toISOString()),
    });
    setIsModalOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setContactSearch("");
    setForm({
      title: appointment.title,
      description: appointment.description ?? "",
      contactId: appointment.contact?.id ?? "",
      interactionId: appointment.interaction?.id ?? "",
      startTime: localDateTime(appointment.startTime),
      endTime: localDateTime(appointment.endTime),
      provider: appointment.provider,
      status: appointment.status,
    });
    setIsModalOpen(true);
  };

  const slotDate = (day: Date, hour: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
  const moveCalendar = (direction: number) =>
    setFocusDate((current) =>
      view === "MONTH"
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : addDays(current, direction * (view === "DAY" ? 1 : 7))
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const version = requestVersion.current;
    const clientId = activeClientAccount.id;
    setIsWorking(true);
    setMessage(null);
    try {
      const submittedInteractionId = form.interactionId;
      const response = await fetch(editing ? `/api/calendar/events/${editing.id}` : "/api/calendar/schedule", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
          contactId: form.contactId || undefined,
          interactionId: form.interactionId || undefined,
        }),
      });
      const data = await readApiJson<{ success: true; appointment: Appointment }>(response);
      if (version !== requestVersion.current || currentClientId.current !== clientId) return;
      const appointment = data.appointment;
      setAppointments((items) =>
        items.some((item) => item.id === appointment.id)
          ? items.map((item) => (item.id === appointment.id ? appointment : item))
          : [...items, appointment].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      );
      setIntents((items) => items.filter((intent) => intent.id !== submittedInteractionId));
      setIsModalOpen(false);
      setMessage({ tone: "success", text: editing ? "Meeting updated." : "Meeting scheduled and saved." });
    } catch (error) {
      if (version !== requestVersion.current || currentClientId.current !== clientId) return;
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The appointment could not be saved." });
    } finally {
      if (version === requestVersion.current && currentClientId.current === clientId) setIsWorking(false);
    }
  };

  const renderAppointment = (appointment: Appointment, compact = false) => (
    <button
      key={appointment.id}
      onClick={(event) => {
        event.stopPropagation();
        openEdit(appointment);
      }}
      className={`w-full rounded-md border p-1.5 text-left transition-all hover:shadow-xs cursor-pointer ${statusClass(appointment.status)} ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold">{appointment.title}</span>
        {appointment.intentDetected && <Sparkles className="h-3 w-3 shrink-0 text-blue-600" />}
      </div>
      <span className="mt-0.5 block opacity-80 text-[11px]">
        {displayTime(appointment.startTime)} · {contactName(appointment.contact)}
      </span>
    </button>
  );

  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-700";
  const inputCls = "w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs";

  return (
    <div className="relative min-h-full space-y-6 font-sans text-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Planner & Cross-CRM Calendar</h1>
          </div>
          <p className="mt-1 text-sm font-normal text-slate-600">
            Unified client schedule with agent-confirmed workflow automation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MultiCrmTag variant="cyan">{activeClientAccount.name}</MultiCrmTag>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Schedule slot
          </button>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <aside className="order-2 space-y-4 xl:order-1 xl:col-span-3">
          <MultiCrmCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">Scheduling signals</h2>
              </div>
              <MultiCrmTag variant="magenta">{intents.length}</MultiCrmTag>
            </div>
            <p className="text-xs text-slate-500">Conversation signals await your date and time confirmation.</p>
            <div className="space-y-3">
              {intents.slice(0, 4).map((intent) => (
                <div key={intent.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-900 line-clamp-2">{intent.subject || "Meeting request detected"}</p>
                  <p className="text-xs text-slate-500">{contactName(intent.contact)} · {displayDateTime(intent.occurredAt)}</p>
                  <p className="text-xs text-slate-600 line-clamp-2">{intent.body}</p>
                  <button
                    onClick={() => openCreate(intent)}
                    className="w-full rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 text-xs font-medium text-blue-700 transition-colors cursor-pointer"
                  >
                    Choose a slot
                  </button>
                </div>
              ))}
              {!isLoading && !intents.length && (
                <p className="py-5 text-center text-xs text-slate-500">No pending scheduling signals.</p>
              )}
            </div>
          </MultiCrmCard>

          <MultiCrmCard className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">Upcoming</h2>
            </div>
            {visibleAppointments.filter((appointment) => appointment.status !== "CANCELLED").slice(0, 4).map((appointment) => (
              <button
                key={appointment.id}
                onClick={() => openEdit(appointment)}
                className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer"
              >
                <p className="truncate text-xs font-semibold text-slate-900">{appointment.title}</p>
                <p className="mt-1 text-xs text-slate-500">{displayDateTime(appointment.startTime)}</p>
              </button>
            ))}
            {!isLoading && !visibleAppointments.length && (
              <p className="text-xs text-slate-500 text-center py-4">No client appointments yet.</p>
            )}
          </MultiCrmCard>
        </aside>

        <section className="order-1 space-y-4 xl:order-2 xl:col-span-9">
          <MultiCrmCard className="space-y-3 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
                  <button
                    onClick={() => moveCalendar(-1)}
                    className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-36 px-2 text-center text-xs font-bold text-slate-900">
                    {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(focusDate)}
                  </span>
                  <button
                    onClick={() => moveCalendar(1)}
                    className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => setFocusDate(new Date())}
                  className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
                >
                  Today
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {(["WEEK", "DAY", "MONTH"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setView(mode)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        view === mode ? "bg-white text-slate-900 font-semibold shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {mode[0] + mode.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "ALL" | Status)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 shadow-2xs"
                >
                  <option value="ALL">All meetings</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </MultiCrmCard>

          {(view === "WEEK" || view === "DAY") && (
            <MultiCrmCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <div style={{ minWidth: view === "DAY" ? 420 : 860 }}>
                  <div
                    className="grid border-b border-slate-200 bg-slate-50 text-center text-xs font-medium"
                    style={{ gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(${view === "DAY" ? "350px" : "115px"}, 1fr))` }}
                  >
                    <div className="p-3 text-xs font-semibold text-slate-500 uppercase">Local</div>
                    {weekDays.map((day) => (
                      <div key={day.toISOString()} className="space-y-1 border-l border-slate-200 py-2.5">
                        <span className="text-xs uppercase text-slate-500 font-semibold">{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day)}</span>
                        <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${sameDay(day, new Date()) ? "bg-blue-600 text-white" : "text-slate-900"}`}>
                          {day.getDate()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="max-h-[680px] overflow-y-auto">
                    {Array.from({ length: 12 }, (_, index) => index + 7).map((hour) => (
                      <div
                        key={hour}
                        className="grid min-h-18 border-b border-slate-100"
                        style={{ gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(${view === "DAY" ? "350px" : "115px"}, 1fr))` }}
                      >
                        <div className="border-r border-slate-200 px-2 pt-2 text-right text-xs text-slate-400">
                          {new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(slotDate(focusDate, hour))}
                        </div>
                        {weekDays.map((day) => {
                          const slots = visibleAppointments.filter((appointment) => {
                            const start = new Date(appointment.startTime);
                            return sameDay(start, day) && start.getHours() === hour;
                          });
                          return (
                            <div
                              key={`${day.toISOString()}-${hour}`}
                              onClick={() => openCreate(undefined, slotDate(day, hour))}
                              className="min-h-18 border-r border-slate-100 p-1 transition-colors hover:bg-slate-50 cursor-pointer"
                            >
                              {slots.map((appointment) => renderAppointment(appointment))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </MultiCrmCard>
          )}

          {view === "MONTH" && (
            <MultiCrmCard className="overflow-hidden p-0">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                {monthDays.map((day) => {
                  const daysAppointments = visibleAppointments.filter((appointment) => sameDay(new Date(appointment.startTime), day));
                  const outside = day.getMonth() !== focusDate.getMonth();
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => openCreate(undefined, slotDate(day, 9))}
                      className={`min-h-28 space-y-1 p-2 transition-colors hover:bg-slate-50 cursor-pointer ${outside ? "bg-slate-50/60 text-slate-400" : "bg-white"}`}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${sameDay(day, new Date()) ? "bg-blue-600 text-white" : "text-slate-900"}`}>
                        {day.getDate()}
                      </span>
                      <div className="space-y-1">
                        {daysAppointments.slice(0, 3).map((appointment) => renderAppointment(appointment, true))}
                        {daysAppointments.length > 3 && (
                          <p className="px-1 text-[10px] font-semibold text-blue-600">+{daysAppointments.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </MultiCrmCard>
          )}
          <p className="text-center text-xs text-slate-500">Click an open time slot or date to create a meeting. Click an appointment to edit, confirm, or cancel it.</p>
        </section>
      </div>

      {isModalOpen && (
        <div className="dashboard-overlay flex items-start justify-center overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-4 sm:items-center z-50">
          <form onSubmit={submit} className="my-auto w-full max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{editing ? "Edit meeting" : "Schedule meeting"}</h2>
                <p className="mt-1 text-xs text-slate-500">All times and selections are confirmed by the agent.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1 block">
                <span className={labelCls}>Meeting title</span>
                <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputCls} />
              </label>
              <label className="space-y-1 block">
                <span className={labelCls}>Calendar provider</span>
                <select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value as Provider })} disabled={Boolean(editing)} className={`${inputCls} disabled:opacity-60`}>
                  <option value="MANUAL">Manual calendar</option>
                  <option value="MOCK">Mock calendar integration</option>
                </select>
              </label>
              <label className="space-y-1 block">
                <span className={labelCls}>Start</span>
                <input required type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className={inputCls} />
              </label>
              <label className="space-y-1 block">
                <span className={labelCls}>End</span>
                <input required type="datetime-local" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} className={inputCls} />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={labelCls}>Contact</span>
                {selectedContact && (
                  <button type="button" onClick={() => setForm({ ...form, contactId: "" })} className="text-xs text-blue-600 hover:underline cursor-pointer">
                    Use account only
                  </button>
                )}
              </div>
              <input
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                placeholder="Search active-client contacts by name or company"
                className={inputCls}
              />
              {selectedContact ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-medium text-slate-800">{contactName(selectedContact)}{selectedContact.company ? ` · ${selectedContact.company}` : ""}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              ) : contactSearch ? (
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => { setForm({ ...form, contactId: contact.id }); setContactSearch(""); }}
                      className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {contactName(contact)}{contact.company ? <span className="ml-2 text-slate-500">{contact.company}</span> : null}
                    </button>
                  ))}
                  {!filteredContacts.length && <p className="p-2 text-xs text-slate-500">No active-client contacts found.</p>}
                </div>
              ) : null}
            </div>

            <label className="block space-y-1">
              <span className={labelCls}>Notes</span>
              <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Purpose, agenda, or joining details" className={inputCls} />
            </label>

            {editing && (
              <label className="block space-y-1">
                <span className={labelCls}>Status</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })} className={inputCls}>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isWorking}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isWorking ? "Saving…" : editing ? "Save changes" : "Schedule meeting"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
