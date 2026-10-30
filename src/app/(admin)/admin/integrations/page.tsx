import AdminWorkspacePage from "@/components/admin/AdminWorkspacePage";
import TwilioSetup from "@/components/admin/TwilioSetup";
import ZohoConnectionRequests from "@/components/admin/ZohoConnectionRequests";

export default function AdminIntegrationsPage() {
  return <><AdminWorkspacePage view="integrations" /><ZohoConnectionRequests /><TwilioSetup /></>;
}
