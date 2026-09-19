import { redirect } from "next/navigation";
import { workspaceHomeForRole } from "@/lib/auth/roles";
import { getPageUser } from "@/lib/auth/server-workspace";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getPageUser();
  if (user) redirect(workspaceHomeForRole(user.role));

  return (
    <main className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center bg-transparent">
      {children}
    </main>
  );
}
