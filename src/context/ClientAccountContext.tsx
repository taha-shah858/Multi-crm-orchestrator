"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ACTIVE_CLIENT_ACCOUNT_COOKIE } from "@/lib/auth/request-context";
import type { ClientAccountSummary } from "@/lib/models/canonical";

const demoClientAccounts: ClientAccountSummary[] = [
  {
    id: "client-northstar-growth",
    organizationId: "dev-company-zenith",
    name: "Northstar Growth",
    brandName: "Northstar",
    communicationIdentity: "+1 (555) 010-2001",
  },
  {
    id: "client-atlas-revenue",
    organizationId: "dev-company-zenith",
    name: "Atlas Revenue Partners",
    brandName: "Atlas",
    communicationIdentity: "+1 (555) 010-2002",
  },
];

interface ClientAccountContextValue {
  clientAccounts: ClientAccountSummary[];
  activeClientAccount: ClientAccountSummary;
  selectClientAccount: (clientAccountId: string) => void;
  isClientAccountReady: boolean;
}

const ClientAccountContext = createContext<ClientAccountContextValue | undefined>(undefined);

function persistActiveClientAccount(clientAccountId: string) {
  localStorage.setItem(ACTIVE_CLIENT_ACCOUNT_COOKIE, clientAccountId);
  document.cookie = `${ACTIVE_CLIENT_ACCOUNT_COOKIE}=${encodeURIComponent(clientAccountId)}; path=/; max-age=86400; samesite=lax`;
}

export function ClientAccountProvider({ children }: { children: React.ReactNode }) {
  const [activeClientAccountId, setActiveClientAccountId] = useState(
    demoClientAccounts[0].id,
  );
  const [isClientAccountReady, setIsClientAccountReady] = useState(false);

  useEffect(() => {
    const savedClientAccountId = localStorage.getItem(ACTIVE_CLIENT_ACCOUNT_COOKIE);
    const initialClientAccountId =
      savedClientAccountId && demoClientAccounts.some(({ id }) => id === savedClientAccountId)
        ? savedClientAccountId
        : demoClientAccounts[0].id;

    persistActiveClientAccount(initialClientAccountId);
    setActiveClientAccountId(initialClientAccountId);
    setIsClientAccountReady(true);
  }, []);

  const selectClientAccount = useCallback((clientAccountId: string) => {
    if (!demoClientAccounts.some(({ id }) => id === clientAccountId)) return;

    // Persist synchronously so client-scoped API reads use the newly selected account.
    persistActiveClientAccount(clientAccountId);
    setActiveClientAccountId(clientAccountId);
  }, []);

  const value = useMemo(() => {
    const activeClientAccount =
      demoClientAccounts.find(({ id }) => id === activeClientAccountId) ?? demoClientAccounts[0];

    return {
      clientAccounts: demoClientAccounts,
      activeClientAccount,
      selectClientAccount,
      isClientAccountReady,
    };
  }, [activeClientAccountId, isClientAccountReady, selectClientAccount]);

  return <ClientAccountContext.Provider value={value}>{children}</ClientAccountContext.Provider>;
}

export function useClientAccount() {
  const context = useContext(ClientAccountContext);
  if (!context) {
    throw new Error("useClientAccount must be used within a ClientAccountProvider");
  }

  return context;
}
