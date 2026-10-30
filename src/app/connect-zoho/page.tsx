import type { Metadata } from "next";
import ZohoInvitation from "@/components/integrations/ZohoInvitation";

export const metadata: Metadata = { title: "Connect your Zoho CRM", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function ConnectZohoPage() { return <ZohoInvitation />; }
