"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, UserRound } from "lucide-react";
import BrandIcon from "@/components/ui/BrandIcon";
import type { WorkspaceRole } from "@/lib/auth/roles";
import PasswordInput from "@/components/auth/PasswordInput";
import { EMAIL_REQUIREMENTS, PASSWORD_REQUIREMENTS, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, isValidEmail, isValidNewPassword } from "@/lib/auth/credential-policy";

export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<WorkspaceRole | "">("");
  const [formData, setFormData] = useState({ workspace: "", email: "", password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (accountType !== "ADMIN") return;
    setEmailInUse(false);
    if (!isValidEmail(formData.email.trim().toLowerCase())) { setError(EMAIL_REQUIREMENTS); return; }
    if (!isValidNewPassword(formData.password)) { setError(PASSWORD_REQUIREMENTS); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountType, workspace: formData.workspace, email: formData.email, password: formData.password }),
      });
      const payload = await response.json().catch(() => null) as { success?: boolean; error?: { code?: string; message?: string } } | null;
      setEmailInUse(payload?.error?.code === "EMAIL_IN_USE");
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Workspace provisioning failed.");
      router.replace("/admin");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Workspace provisioning failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide uppercase";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4">
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
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Choose the account path first</p>
        </div>

        {/* Role selector */}
        <div>
          <label className={labelCls}>Choose your role</label>
          <select
            aria-label="Signup role"
            value={accountType}
            onChange={(event) => { setAccountType(event.target.value as WorkspaceRole | ""); setError(null); setEmailInUse(false); }}
            className={inputCls}
          >
            <option value="">Select Administrator or Sales Agent</option>
            <option value="ADMIN">Company Administrator</option>
            <option value="AGENT">Sales Agent</option>
          </select>
        </div>

        {!accountType && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-medium text-slate-700">Select a role to see the correct signup path</p>
          </div>
        )}

        {accountType === "AGENT" && (
          <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-5 text-center">
            <UserRound className="mx-auto h-6 w-6 text-blue-500" />
            <div>
              <h1 className="text-base font-semibold text-slate-800">Sales Agent access</h1>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Agent accounts must be created by your company Administrator. Ask your Administrator to add you under Admin Workspace → Agents / Team, then sign in with those credentials.
              </p>
            </div>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50">
              CONTINUE TO AGENT LOGIN <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {accountType === "ADMIN" && (
          <>
            <div className="text-center space-y-1">
              <Building2 className="mx-auto h-6 w-6 text-violet-500" />
              <h1 className="text-lg font-bold text-slate-900">Create Company Admin</h1>
              <p className="text-sm text-slate-500">Provision a new company workspace and its first Administrator</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthInput label="Workspace title"   value={formData.workspace}        onChange={(v) => setFormData({ ...formData, workspace:        v })} />
              <AuthInput label="Email" value={formData.email} onChange={(v) => { setFormData({ ...formData, email: v }); setError(null); setEmailInUse(false); }} type="email" />
              <div className="grid grid-cols-2 gap-3">
                <AuthInput label="Password"         value={formData.password}         onChange={(v) => setFormData({ ...formData, password:         v })} type="password" />
                <AuthInput label="Confirm password" value={formData.confirmPassword}  onChange={(v) => setFormData({ ...formData, confirmPassword:  v })} type="password" />
              </div>
              <p id="password-requirements" className="text-xs text-slate-600">{PASSWORD_REQUIREMENTS}</p>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
              {emailInUse && <Link href="/login" className="block text-sm font-medium text-blue-600 hover:underline">Sign in to your existing account</Link>}
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <span>{isLoading ? "PROVISIONING WORKSPACE…" : "CREATE ADMIN WORKSPACE"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </>
        )}

        <div className="border-t border-slate-200 pt-4 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> RETURN TO LOGIN
          </Link>
        </div>
      </div>
    </div>
  );
}

function AuthInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  if (type === "password") return <PasswordInput label={label} labelClassName="text-[11px] font-semibold tracking-wider text-slate-600 uppercase" value={value} onChange={event => onChange(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" aria-describedby="password-requirements" className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600" />;
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={type === "email" ? "email" : type === "password" ? "new-password" : undefined}
        className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
      />
    </label>
  );
}
