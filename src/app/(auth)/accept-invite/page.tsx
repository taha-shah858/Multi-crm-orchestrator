"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";
import { PASSWORD_REQUIREMENTS } from "@/lib/auth/credential-policy";
import BrandIcon from "@/components/ui/BrandIcon";
import { PasswordInput } from "@/components/ui/password-input";
import { workspaceHomeForRole } from "@/lib/auth/roles";
import type { AuthenticatedUser } from "@/lib/models/canonical";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-2 text-xs text-slate-500 font-sans">Loading invitation…</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invitationInfo, setInvitationInfo] = useState<{
    email: string;
    role: string;
    organizationName: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided in the link.");
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/members/accept-invite?token=${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          throw new Error(data?.error?.message || "Invalid or expired invitation link.");
        }
        setInvitationInfo(data.invitation);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invitation.");
      } finally {
        setLoading(false);
      }
    };

    void verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/members/accept-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const payload = await response.json().catch(() => null) as {
        success?: boolean;
        user?: AuthenticatedUser;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.success || !payload.user) {
        throw new Error(payload?.error?.message ?? "Failed to accept invitation.");
      }

      router.replace(workspaceHomeForRole(payload.user.role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans shadow-2xs";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5 tracking-wider uppercase font-sans";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4">
      <div className="pointer-events-none absolute h-96 w-96 -top-24 -left-24 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute h-96 w-96 -bottom-24 -right-24 rounded-full bg-violet-100 blur-3xl opacity-50" />

      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg p-8 space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 border border-blue-200 bg-blue-50 px-4 py-2 rounded-xl">
              <BrandIcon size={20} />
              <span className="font-bold text-sm tracking-widest uppercase text-blue-700">MULTI-CRM ORCHESTRATOR</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Team Invitation Acceptance</p>
        </div>

        {loading && (
          <div className="py-10 text-center space-y-3">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-xs text-slate-500 font-sans">Verifying invitation credentials…</p>
          </div>
        )}

        {!loading && error && !invitationInfo && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center space-y-3">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
            <h2 className="text-sm font-bold text-red-900 font-sans">Invalid Invitation</h2>
            <p className="text-xs text-red-700 font-sans leading-relaxed">{error}</p>
            <div className="pt-2">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                Go to login page &rarr;
              </Link>
            </div>
          </div>
        )}

        {!loading && invitationInfo && (
          <div className="space-y-5">
            {/* Invitation Details Banner */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 font-sans">
                  Join {invitationInfo.organizationName}
                </h2>
              </div>
              <p className="text-xs text-slate-600 font-sans">
                You have been invited as{" "}
                <span className="font-semibold text-slate-900">
                  {invitationInfo.role === "ADMIN" ? "Company Administrator" : invitationInfo.role === "MANAGER" ? "Manager" : "Sales Agent"}
                </span>{" "}
                for <span className="font-medium text-slate-900">{invitationInfo.email}</span>.
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-sans">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Taylor (letters and spaces only)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="space-y-3">
                <PasswordInput
                  label="Create Password"
                  required
                  autoComplete="new-password"
                  placeholder="At least 7 chars, uppercase, number & symbol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <PasswordInput
                  label="Confirm Password"
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 font-sans leading-relaxed">
                <span className="font-semibold text-slate-700">Security Policy:</span> {PASSWORD_REQUIREMENTS}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>{submitting ? "ACTIVATING ACCOUNT…" : "ACCEPT INVITE & ACTIVATE"}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </form>

            <div className="border-t border-slate-200 pt-3 text-center">
              <Link href="/login" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
                Already registered? Sign in instead
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
