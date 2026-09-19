import AdminWorkspaceShell from "@/components/admin/AdminWorkspaceShell";
import { requireAdminWorkspaceUser } from "@/lib/auth/server-workspace";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminWorkspaceUser();
  return <AdminWorkspaceShell user={user}>{children}</AdminWorkspaceShell>;
}
