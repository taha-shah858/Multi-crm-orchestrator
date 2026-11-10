import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | MultiCRM Orchestrator",
  description: "Terms for using the MultiCRM Orchestrator sales workspace and its connected integrations.",
};

const sections = [
  { title: "About these terms", text: <>These terms describe use of MultiCRM Orchestrator at multi-crm-orchestrator.netlify.app. The service operator can be contacted at <a href="mailto:shahtaha111@gmail.com" className="text-blue-700 underline">shahtaha111@gmail.com</a>. Review these terms before using the service and contact support if you have questions. You must have authority to act for any company workspace or connected account you use.</> },
  { title: "Testing-stage service", text: <>The service is currently offered for testing and evaluation. Features and availability may change, and integrations may fail or require reconnection. Do not rely on this test service as your only copy of business records or as the sole mechanism for time-sensitive communications, bookings or financial tracking. Keep independent records and verify important actions with the relevant provider.</> },
  { title: "Accounts and workspace responsibilities", text: <>Provide accurate account information, protect your credentials and use only accounts you are authorized to access. Workspace administrators manage membership and client assignments. Agents must respect those assignments and the boundaries between agency, client and personal accounts. Notify support if you suspect unauthorized access. Do not share passwords, access tokens or verification codes with support.</> },
  { title: "Connected accounts and permissions", text: <>Connecting a CRM, calendar or communications provider authorizes the service to perform the supported actions you request within the granted permissions. You remain responsible for having the necessary authority and reviewing the provider’s consent screen. Third-party terms, account plans, quotas and administrator policies apply separately. Connecting an account does not guarantee access to every provider feature or establish approval by that provider.</> },
  { title: "Data and acceptable use", text: <>You retain your rights in content you submit. Submit only information you are entitled to process and authorize its use for the workspace features you request. Do not use the service for unlawful activity, unsolicited or deceptive communications, harassment, unauthorized access, or attempts to bypass tenant, client or user permissions. Do not upload malicious content or interfere with service operation. Obtain any required consent before recording communications or processing another person’s information.</> },
  { title: "Review external actions and generated content", text: <>Review recipients, client context, phone identity, meeting details and CRM destinations before taking action. An external provider action may succeed even when the app reports a timeout; check the provider before retrying to avoid duplicates. AI-generated analyses, scripts and proposals may contain errors and require human review. Drafts do not establish agreed commercial terms. Commission and time reports reflect recorded data and do not themselves prove payment, create payroll obligations or execute payments.</> },
  { title: "Privacy and account controls", text: <>Our <Link href="/privacy" className="text-blue-700 underline">privacy policy</Link> explains data access, storage, sharing and retention, including Google Calendar data. You may disconnect supported integrations and revoke access through the relevant provider. Disconnecting does not automatically delete existing workspace records or reverse actions already performed. Contact support to request account or data deletion; workspace authority and applicable retention obligations may need to be checked.</> },
  { title: "Availability, restrictions and ending use", text: <>There is no promised uptime or uninterrupted provider synchronization for this test service. You may stop using the service and request deletion through support. Access may be restricted to address misuse, security concerns, provider requirements or service changes. Where practical, support will explain the restriction and how to resolve it. Keep copies of records you need independently of the service.</> },
  { title: "Third-party charges and your rights", text: <>Using a connected provider may incur charges under your own agreement with that provider, including call, message or subscription fees. Review those charges with the provider before enabling its features. These terms do not remove rights or protections that cannot be excluded under applicable law.</> },
  { title: "Updates and contact", text: <>Updates to these terms will be posted on this page with a revised effective date. Review updated terms before continuing to use changed features. Questions about the service, these terms or your workspace can be sent to shahtaha111@gmail.com.</> },
];

export default function TermsPage() {
  return <article className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
    <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
    <p className="mt-4 text-sm text-slate-600">Effective November 10, 2026</p>
    <p className="mt-6 text-lg leading-relaxed text-slate-600">Using the MultiCRM Orchestrator workspace and its connected services.</p>
    <div className="mt-12 space-y-10">{sections.map(section => <section key={section.title}><h2 className="text-xl font-semibold">{section.title}</h2><p className="mt-3 leading-7 text-slate-600">{section.text}</p></section>)}</div>
  </article>;
}
