"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/ui/password-input";
import { PASSWORD_REQUIREMENTS } from "@/lib/auth/credential-policy";
import { forgotPasswordSchema, resetPasswordSchema, formatZodError } from "@/lib/auth/validations";

export default function PasswordRecoveryForm({ mode }: { mode: "request" | "reset" }) {
  return <Suspense fallback={<main className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Loading…</main>}><RecoveryForm mode={mode} /></Suspense>;
}

function RecoveryForm({ mode }: { mode: "request" | "reset" }) {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const token = params.get("token") || "";
  const reset = mode === "reset";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = reset ? resetPasswordSchema.safeParse({ token, password }) : forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) { setError(formatZodError(parsed.error)); return; }
    if (reset && password !== confirmation) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${reset ? "reset-password" : "forgot-password"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "Unable to complete this request. Try again.");
      setMessage(payload.message);
      if (reset) {
        setPassword(""); setConfirmation("");
        window.history.replaceState(null, "", "/reset-password");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to complete this request. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{reset ? "Choose a new password" : "Forgot password?"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{reset ? "Set a new password for your account. You will need to sign in again afterward." : "Enter your account email and we’ll send you a link to reset your password."}</p>
        {message ? <div role="status" className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{message}</div> : reset && !token ? <p role="alert" className="mt-6 text-sm text-red-700">This link is missing its reset token. <Link href="/forgot-password" className="underline">Request a new link.</Link></p> : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {reset ? <>
              <PasswordInput label="New password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required />
              <PasswordInput label="Confirm new password" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" required />
              <p className="text-xs leading-5 text-slate-500">{PASSWORD_REQUIREMENTS}</p>
            </> : <div>
              <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
              <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy} type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Please wait…" : reset ? "Save new password" : "Send reset link"}</button>
          </form>
        )}
        {reset && error && <Link href="/forgot-password" className="mt-4 block text-sm text-blue-600 hover:underline">Request a new reset link</Link>}
        <Link href="/login" className="mt-6 inline-block text-sm text-blue-600 hover:underline">Back to sign in</Link>
      </section>
    </main>
  );
}
