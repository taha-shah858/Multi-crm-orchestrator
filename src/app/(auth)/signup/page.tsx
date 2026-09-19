"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Shield, UserRound } from "lucide-react";
import { MultiCrmCard } from "@/components/ui/MultiCrmCard";
import type { WorkspaceRole } from "@/lib/auth/roles";

export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<WorkspaceRole | "">("");
  const [formData, setFormData] = useState({ workspace: "", email: "", password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (accountType !== "ADMIN") return;
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountType, workspace: formData.workspace, email: formData.email, password: formData.password }),
      });
      const payload = await response.json().catch(() => null) as { success?: boolean; error?: { message?: string } } | null;
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Workspace provisioning failed.");
      router.replace("/admin");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Workspace provisioning failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent p-4">
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute h-96 w-96 translate-x-32 translate-y-32 rounded-full bg-purple-500/10 blur-3xl" />

      <MultiCrmCard className="relative z-10 w-full max-w-md space-y-6 border-cyan-500/20 bg-crm-base/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-400 shadow-inner"><Shield className="h-4 w-4" /><span>MULTI-CRM ORCHESTRATOR</span></div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-crm-text-muted">Choose the account path first</p>
        </div>

        <label className="block space-y-2">
          <span className="text-[11px] font-mono font-medium tracking-wider text-crm-text-muted">CHOOSE YOUR ROLE</span>
          <select aria-label="Signup role" value={accountType} onChange={(event) => { setAccountType(event.target.value as WorkspaceRole | ""); setError(null); }} className="w-full rounded-xl border border-crm-border bg-crm-inner/90 px-4 py-3 text-xs font-mono text-crm-text shadow-inner outline-none transition focus:border-cyan-500/60">
            <option value="">Select Administrator or Sales Agent</option>
            <option value="ADMIN">Company Administrator</option>
            <option value="AGENT">Sales Agent</option>
          </select>
        </label>

        {!accountType && <div className="rounded-2xl border border-crm-border bg-crm-inner/55 p-5 text-center"><Shield className="mx-auto h-5 w-5 text-primary-cyan" /><p className="mt-3 text-xs text-crm-text">Select a role to see the correct signup path</p></div>}

        {accountType === "AGENT" && (
          <div className="space-y-5 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-5 text-center">
            <UserRound className="mx-auto h-6 w-6 text-cyan-300" />
            <div><h1 className="text-lg font-semibold text-crm-text">Sales Agent access</h1><p className="mt-2 text-xs leading-relaxed text-crm-text-muted">Agent accounts must be created by your company Administrator so your company and assigned client accounts remain secure. Ask your Administrator to add you under Admin Workspace → Agents / Team, then sign in with those credentials.</p></div>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2.5 text-xs font-mono text-cyan-300 transition hover:bg-cyan-500/20">CONTINUE TO AGENT LOGIN <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        )}

        {accountType === "ADMIN" && (
          <>
            <div className="space-y-1 text-center"><Building2 className="mx-auto h-6 w-6 text-purple-300" /><h1 className="text-xl font-bold uppercase tracking-tight text-crm-text">Create Company Admin</h1><p className="text-xs font-mono text-crm-text-muted">Provision a new company workspace and its first Administrator</p></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthInput label="Workspace title" value={formData.workspace} onChange={(value) => setFormData({ ...formData, workspace: value })} />
              <AuthInput label="Email" type="email" value={formData.email} onChange={(value) => setFormData({ ...formData, email: value })} />
              <div className="grid grid-cols-2 gap-3"><AuthInput label="Password" type="password" value={formData.password} onChange={(value) => setFormData({ ...formData, password: value })} /><AuthInput label="Confirm password" type="password" value={formData.confirmPassword} onChange={(value) => setFormData({ ...formData, confirmPassword: value })} /></div>
              {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-mono text-rose-200">{error}</p>}
              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-purple-500 px-4 py-3.5 text-xs font-bold tracking-wider text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"><span>{isLoading ? "PROVISIONING WORKSPACE…" : "CREATE ADMIN WORKSPACE"}</span><ArrowRight className="h-4 w-4" /></button>
            </form>
          </>
        )}

        <div className="border-t border-crm-border pt-4 text-center"><Link href="/login" className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 transition hover:text-cyan-300"><ArrowLeft className="h-3 w-3" /> RETURN TO LOGIN</Link></div>
      </MultiCrmCard>
    </div>
  );
}

function AuthInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block space-y-1.5"><span className="text-[10px] font-mono font-semibold tracking-wider text-cyan-400">{label.toUpperCase()}</span><input type={type} required value={value} onChange={(event) => onChange(event.target.value)} autoComplete={type === "email" ? "email" : type === "password" ? "new-password" : undefined} className="w-full rounded-xl border border-crm-border bg-crm-inner/90 px-4 py-3 text-xs font-mono text-crm-text shadow-inner outline-none transition focus:border-cyan-500/60" /></label>;
}
