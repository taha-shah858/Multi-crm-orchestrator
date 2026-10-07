"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Lock, UserRound } from "lucide-react";
import BrandIcon from "@/components/ui/BrandIcon";
import { PasswordInput } from "@/components/ui/password-input";
import { workspaceHomeForRole, type WorkspaceRole } from "@/lib/auth/roles";
import type { AuthenticatedUser } from "@/lib/models/canonical";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-slate-100 p-4">
          <div className="text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500 font-sans">Loading authentication…</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryEmail = searchParams.get("email") || "";
  const queryRole = (searchParams.get("role") as WorkspaceRole) || "";
  const isVerified = searchParams.get("verified") === "true";

  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | "">(queryRole || "");
  const [email, setEmail] = useState(queryEmail);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNotice] = useState<string | null>(
    searchParams.get("invited") === "true"
      ? "Invitation accepted. Sign in with your invited email and new password. Your administrator will assign your client accounts."
      : isVerified ? "Account verified successfully! Please enter your password to sign in and start working." : null
  );


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

  const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans shadow-2xs";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide uppercase font-sans";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4">
      {/* Subtle decorative blobs */}
      <div className="pointer-events-none absolute h-96 w-96 -top-24 -left-24 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute h-96 w-96 -bottom-24 -right-24 rounded-full bg-violet-100 blur-3xl opacity-50" />

      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg p-8 space-y-6">

        {/* Brand header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 border border-blue-200 bg-blue-50 px-4 py-2 rounded-xl">
              <BrandIcon size={20} />
              <span className="font-bold text-sm tracking-widest uppercase text-blue-700">MULTI-CRM ORCHESTRATOR</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Secure workspace authentication</p>
        </div>

        {verifiedNotice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <p role="status" className="text-xs text-emerald-800 font-sans leading-relaxed">
              {verifiedNotice}
            </p>
          </div>
        )}

        {/* Role selector */}
        <div>
          <label className={labelCls}>Choose your workspace role</label>
          <select
            aria-label="Workspace role"
            value={workspaceRole}
            onChange={(event) => { setWorkspaceRole(event.target.value as WorkspaceRole | ""); setError(null); }}
            className={inputCls}
          >
            <option value="">Select Admin / Manager or Sales Agent</option>
            <option value="ADMIN">Admin / Manager workspace</option>
            <option value="AGENT">Sales Agent workspace</option>
          </select>
        </div>

        {!workspaceRole && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-medium text-slate-700">Select your role to continue</p>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">Your stored account role will be verified by the server before a session is created.</p>
          </div>
        )}

        {workspaceRole && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {workspaceRole === "ADMIN"
                ? <Building2 className="h-4 w-4 text-violet-500 shrink-0" />
                : <UserRound  className="h-4 w-4 text-blue-500  shrink-0" />}
              <div>
                <p className="text-sm font-medium text-slate-800">{workspaceRole === "ADMIN" ? "Admin / Manager workspace" : "Sales Agent workspace"}</p>
                <p className="text-xs text-slate-400 mt-0.5">Role match required</p>
              </div>
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className={inputCls} />
            </div>

            <div>
              <PasswordInput
                label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Server-backed session</p>
                <p className="text-xs text-slate-400">Secure cookie · 7-day expiry</p>
              </div>
              <Lock className="h-4 w-4 text-emerald-500" />
            </div>

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <span>{isLoading ? "AUTHENTICATING…" : `OPEN ${workspaceRole === "ADMIN" ? "ADMIN" : "AGENT"} WORKSPACE`}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <div className="border-t border-slate-200 pt-4 text-center">
          <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
            Choose a signup path <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
