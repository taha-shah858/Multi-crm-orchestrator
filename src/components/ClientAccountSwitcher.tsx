"use client";

import { Building2 } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";

export default function ClientAccountSwitcher() {
  const { activeClientAccount, clientAccounts, selectClientAccount } = useClientAccount();

  return (
    <label className="flex items-center gap-2 text-[10px] font-mono text-crm-text-muted">
      <Building2 className="h-3.5 w-3.5 text-primary-cyan" />
      <span className="hidden xl:inline">CLIENT ACCOUNT</span>
      <select
        aria-label="Active client account"
        value={activeClientAccount.id}
        onChange={(event) => selectClientAccount(event.target.value)}
        className="max-w-44 bg-white/5 px-2 py-1.5 text-xs text-crm-text outline-none"
      >
        {clientAccounts.map((clientAccount) => (
          <option key={clientAccount.id} value={clientAccount.id}>
            {clientAccount.name}
          </option>
        ))}
      </select>
    </label>
  );
}
