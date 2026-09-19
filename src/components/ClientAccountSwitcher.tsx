"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";

export default function ClientAccountSwitcher() {
  const { activeClientAccount, clientAccounts, selectClientAccount, isClientAccountReady } = useClientAccount();
  const [error, setError] = useState<string | null>(null);

  return (
    <label className="flex items-center gap-2 text-[10px] font-mono text-crm-text-muted">
      <Building2 className="h-3.5 w-3.5 text-primary-cyan" />
      <span className="hidden xl:inline">CLIENT ACCOUNT</span>
      <select
        aria-label="Active client account"
        value={activeClientAccount.id}
        disabled={!isClientAccountReady || !clientAccounts.length}
        onChange={(event) => { setError(null); void selectClientAccount(event.target.value).catch((reason) => setError(reason instanceof Error ? reason.message : "Client selection failed.")); }}
        className="max-w-44 bg-white/5 px-2 py-1.5 text-xs text-crm-text outline-none"
      >
        {clientAccounts.map((clientAccount) => (
          <option key={clientAccount.id} value={clientAccount.id}>
            {clientAccount.name}
          </option>
        ))}
      </select>
      {error && <span role="status" className="hidden text-[10px] text-rose-300 2xl:inline">{error}</span>}
    </label>
  );
}
