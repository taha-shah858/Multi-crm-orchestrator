"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Network,
  Users,
} from "lucide-react";
import type { AuthenticatedUser } from "@/lib/models/canonical";
import BrandIcon from "@/components/ui/BrandIcon";

const navigation = [
  { name: "Dashboard",          href: "/admin",                icon: LayoutDashboard   },
  { name: "Agents / Team",      href: "/admin/agents",         icon: Users             },
  { name: "Client Accounts",    href: "/admin/clients",        icon: Building2         },
  { name: "Assignments",        href: "/admin/assignments",    icon: ClipboardCheck    },
  { name: "Sales Operations",   href: "/admin/operations",     icon: BriefcaseBusiness },
  { name: "Commissions",        href: "/admin/commissions",    icon: CircleDollarSign  },
  { name: "Business Analytics", href: "/admin/analytics",      icon: ChartNoAxesCombined },
  { name: "Integrations / Sync",href: "/admin/integrations",   icon: Network           },
  { name: "Audit Logs",         href: "/admin/audit",          icon: Activity          },
];

const AdminWorkspaceContext = createContext<AuthenticatedUser | null>(null);

export function useAdminWorkspaceUser() {
  const user = useContext(AdminWorkspaceContext);
  if (!user) throw new Error("useAdminWorkspaceUser must be used inside AdminWorkspaceShell");
  return user;
}

export default function AdminWorkspaceShell({ user, children }: { user: AuthenticatedUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <AdminWorkspaceContext.Provider value={user}>
      <div className="flex h-dvh w-full bg-slate-50">

        {/* ── Left nav ── */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">

          {/* Brand header */}
          <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-4">
            <BrandIcon size={26} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white">Administration</p>
              <p className="text-[10px] font-sans font-medium text-blue-400 tracking-wider">Company control plane</p>
            </div>
          </div>

          {/* Nav items */}
          <nav aria-label="Admin workspace" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {navigation.map((item) => {
              const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
              const Icon   = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="m-2 rounded-lg border border-slate-800 bg-slate-800/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{user.role} · COMPANY SCOPE</p>
              </div>
              <button
                onClick={() => void logout()}
                title="Sign out"
                className="rounded-md border border-slate-700 p-1.5 text-slate-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Top header */}
          <header className="z-50 shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Admin Workspace</p>
                  <p className="text-[10px] text-slate-500 font-sans font-medium uppercase tracking-wide">Company-wide governance & operations</p>
                </div>
              </div>
              <button
                onClick={() => void logout()}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 lg:hidden"
              >
                SIGN OUT
              </button>
            </div>

            {/* Mobile nav */}
            <nav aria-label="Admin workspace mobile" className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navigation.map((item) => {
                const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${
                      active
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F1F5F9]">
            {children}
          </main>
        </div>
      </div>
    </AdminWorkspaceContext.Provider>
  );
}
