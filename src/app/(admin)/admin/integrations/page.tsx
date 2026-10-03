import AdminWorkspacePage from "@/components/admin/AdminWorkspacePage";
import TwilioSetup from "@/components/admin/TwilioSetup";

export default function AdminIntegrationsPage() {
  return <><AdminWorkspacePage view="integrations" /><TwilioSetup /></>;
}
