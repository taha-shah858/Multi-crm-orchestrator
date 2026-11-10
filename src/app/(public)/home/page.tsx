import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MultiCRM Orchestrator | Sales workspace",
  description: "A sales workspace connecting agency leads, client CRM handoffs, agent tracking and personal calendar scheduling.",
};

export default function PublicHome() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-blue-700">A shared sales workspace</p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Keep client work connected.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">Work with agency leads, client handoffs, conversations and meetings in one place.</p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link href="/signup" className="rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800">Create a workspace</Link>
          <a href="#connections" className="rounded-lg border border-slate-300 px-6 py-3 font-medium hover:bg-slate-50">Explore connections</a>
        </div>
      </section>
      <section id="connections" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1fr_1.4fr]">
          <div><h2 className="text-3xl font-semibold tracking-tight">The right account for every role.</h2><p className="mt-4 leading-relaxed text-slate-600">Connect supported accounts through the provider’s consent screen. Available features depend on account permissions, provider plans and workspace assignments.</p></div>
          <dl className="space-y-7">
            <div><dt className="font-semibold">Agency leads · HubSpot</dt><dd className="mt-2 leading-relaxed text-slate-600">Keep a shared agency lead directory while switching between assigned clients.</dd></div>
            <div><dt className="font-semibold">Client handoffs · Zoho CRM</dt><dd className="mt-2 leading-relaxed text-slate-600">Connect a client’s CRM for supported record updates and closed-sale handoffs.</dd></div>
            <div><dt className="font-semibold">Agent tracking · ClickUp</dt><dd className="mt-2 leading-relaxed text-slate-600">Connect an agent’s account to track supported closed-sale activity.</dd></div>
          </dl>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
        <div><h2 className="text-3xl font-semibold tracking-tight">Schedule with your own calendar.</h2><p className="mt-4 leading-relaxed text-slate-600">Agents can connect Google Calendar, Outlook Calendar or Calendly to create and manage supported appointments from their workspace. Manual scheduling remains available when a provider is unavailable.</p></div>
        <div className="border-l-2 border-blue-700 pl-6"><h3 className="text-xl font-semibold">What Google access is used for</h3><p className="mt-3 leading-relaxed text-slate-600">With your permission, we identify your connected Google account and access events on calendars you own to support appointment creation, updates, cancellation and status refresh. Calendar authorization is separate from signing into this app.</p><p className="mt-4 leading-relaxed text-slate-600">You can disconnect a calendar in the app and revoke access in your Google Account. Read our <Link href="/privacy" className="font-medium text-blue-700 underline underline-offset-4">privacy policy</Link> for data use and deletion details.</p></div>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-16"><h2 className="text-2xl font-semibold">Support for the work around a sale.</h2><p className="mt-4 max-w-3xl leading-relaxed text-slate-600">The workspace also includes interaction logging, editable AI-assisted lead analysis and drafts, proposals, commissions and time reports. Provider-generated content and external actions need appropriate review; manual workflows remain available.</p></section>
    </>
  );
}
