"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthenticatedUser, ClientAccountSummary } from "@/lib/models/canonical";

const pendingAccount: ClientAccountSummary = {
  id: "",
  organizationId: "",
  name: "Loading workspace",
  brandName: "Loading",
};

interface ClientAccountContextValue {
  user: AuthenticatedUser | null;
  clientAccounts: ClientAccountSummary[];
  activeClientAccount: ClientAccountSummary;
  selectClientAccount: (clientAccountId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  isClientAccountReady: boolean;
}

const ClientAccountContext = createContext<ClientAccountContextValue | undefined>(undefined);

export function ClientAccountProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [clientAccounts, setClientAccounts] = useState<ClientAccountSummary[]>([]);
  const [activeClientAccountId, setActiveClientAccountId] = useState("");
  const [isClientAccountReady, setIsClientAccountReady] = useState(false);

  const refreshSession = useCallback(async () => {
    if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) {
      setIsClientAccountReady(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.status === 401) {
        setUser(null);
        setClientAccounts([]);
        setActiveClientAccountId("");
        setIsClientAccountReady(false);
        router.replace("/login");
        return;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("application/json")) {
        console.warn("[ClientAccountContext] Unexpected response fetching session:", response.status);
        return;
      }
      const payload = (await response.json()) as {
        success?: boolean;
        user?: AuthenticatedUser;
        clientAccounts?: ClientAccountSummary[];
        activeClientAccountId?: string | null;
      };
      if (!payload.success || !payload.user) {
        return;
      }
      const accounts = payload.clientAccounts ?? [];
      setUser(payload.user);
      setClientAccounts(accounts);
      setActiveClientAccountId(payload.activeClientAccountId ?? accounts[0]?.id ?? "");
      setIsClientAccountReady(true);
    } catch (err) {
      console.warn("[ClientAccountContext] Error refreshing session:", err);
    }
  }, [pathname, router]);

  useEffect(() => { void refreshSession(); }, [refreshSession]);

  const selectClientAccount = useCallback(async (clientAccountId: string) => {
    if (!clientAccounts.some((account) => account.id === clientAccountId) || clientAccountId === activeClientAccountId) return;
    const response = await fetch("/api/auth/client-account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientAccountId }) });
    const payload = await response.json().catch(() => null) as { success?: boolean; error?: { message?: string } } | null;
    if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "The client account could not be selected.");
    setActiveClientAccountId(clientAccountId);
  }, [activeClientAccountId, clientAccounts]);

  const value = useMemo(() => ({
    user,
    clientAccounts,
    activeClientAccount: clientAccounts.find((account) => account.id === activeClientAccountId) ?? clientAccounts[0] ?? pendingAccount,
    selectClientAccount,
    refreshSession,
    isClientAccountReady,
  }), [activeClientAccountId, clientAccounts, isClientAccountReady, refreshSession, selectClientAccount, user]);

  return <ClientAccountContext.Provider value={value}>{children}</ClientAccountContext.Provider>;
}

export function useClientAccount() {
  const context = useContext(ClientAccountContext);
  if (!context) throw new Error("useClientAccount must be used within a ClientAccountProvider");
  return context;
}
