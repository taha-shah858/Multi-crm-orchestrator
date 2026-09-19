import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import { ClientAccountProvider } from "@/context/ClientAccountContext";
import { requireAgentWorkspaceUser } from "@/lib/auth/server-workspace";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  await requireAgentWorkspaceUser();
  return (
    <ClientAccountProvider>
      <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
    </ClientAccountProvider>
  );
}
