"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Key, Lock, Shield, UserRound } from "lucide-react";
import { MultiCrmCard } from "@/components/ui/MultiCrmCard";
import { workspaceHomeForRole, type WorkspaceRole } from "@/lib/auth/roles";
import type { AuthenticatedUser } from "@/lib/models/canonical";

export default function LoginPage() {
  const router = useRouter();
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceRole) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, workspaceRole }),
      });
      const payload = await response.json().catch(() => null) as { success?: boolean; user?: AuthenticatedUser; error?: { message?: string } } | null;
      if (!response.ok || !payload?.success || !payload.user) throw new Error(payload?.error?.message ?? "Sign in failed.");
      router.replace(workspaceHomeForRole(payload.user.role));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent p-4">
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute h-96 w-96 translate-x-32 translate-y-32 rounded-full bg-purple-500/10 blur-3xl" />

      <MultiCrmCard className="relative z-10 w-full max-w-md space-y-7 border-cyan-500/20 bg-crm-base/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-400 shadow-inner">
            <Shield className="h-4 w-4" />
            <span>MULTI-CRM ORCHESTRATOR</span>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-crm-text-muted">Secure workspace authentication</p>
        </div>

        <label className="block space-y-2">
          <span className="text-[11px] font-mono font-medium tracking-wider text-crm-text-muted">CHOOSE YOUR WORKSPACE ROLE</span>
          <select
            aria-label="Workspace role"
            value={workspaceRole}
            onChange={(event) => { setWorkspaceRole(event.target.value as WorkspaceRole | ""); setError(null); }}
            className="w-full rounded-xl border border-crm-border bg-crm-inner/90 px-4 py-3 text-xs font-mono text-crm-text shadow-inner outline-none transition focus:border-cyan-500/60"
          >
            <option value="">Select Admin / Manager or Sales Agent</option>
            <option value="ADMIN">Admin / Manager workspace</option>
            <option value="AGENT">Sales Agent workspace</option>
          </select>
        </label>

        {!workspaceRole && (
          <div className="rounded-2xl border border-crm-border bg-crm-inner/55 p-5 text-center">
            <Shield className="mx-auto h-5 w-5 text-primary-cyan" />
            <p className="mt-3 text-xs text-crm-text">Select your role to continue</p>
            <p className="mt-1 text-[10px] font-mono leading-relaxed text-crm-text-muted">Your stored account role will be verified by the server before a session is created.</p>
          </div>
        )}

        {workspaceRole && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl border border-crm-border bg-crm-inner/60 p-3">
              {workspaceRole === "ADMIN" ? <Building2 className="h-4 w-4 text-purple-300" /> : <UserRound className="h-4 w-4 text-cyan-300" />}
              <div>
                <p className="text-xs font-medium text-crm-text">{workspaceRole === "ADMIN" ? "Admin / Manager workspace" : "Sales Agent workspace"}</p>
                <p className="mt-0.5 text-[10px] font-mono text-crm-text-muted">ROLE MATCH REQUIRED</p>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-[11px] font-mono font-medium tracking-wider text-crm-text-muted">EMAIL</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full rounded-xl border border-crm-border bg-crm-inner/90 px-4 py-3 text-xs font-mono text-crm-text shadow-inner outline-none transition focus:border-cyan-500/60" />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-mono font-medium tracking-wider text-crm-text-muted">PASSWORD</span>
              <span className="relative block">
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="w-full rounded-xl border border-crm-border bg-crm-inner/90 px-4 py-3 pr-11 text-xs font-mono text-crm-text shadow-inner outline-none transition focus:border-cyan-500/60" />
                <Key className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </span>
            </label>

            <div className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-inner/60 p-3">
              <div><p className="text-xs font-medium text-crm-text">Server-backed session</p><p className="text-[10px] font-mono text-crm-text-muted">Secure cookie · 7-day expiry</p></div>
              <Lock className="h-4 w-4 text-emerald-400" />
            </div>

            {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-mono text-rose-200">{error}</p>}

            <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-purple-500 px-4 py-3.5 text-xs font-bold tracking-wider text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50">
              <span>{isLoading ? "AUTHENTICATING…" : `OPEN ${workspaceRole === "ADMIN" ? "ADMIN" : "AGENT"} WORKSPACE`}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <div className="border-t border-crm-border pt-4 text-center">
          <Link href="/signup" className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 transition hover:text-cyan-300">Choose a signup path <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </MultiCrmCard>
    </div>
  );
}
