"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, KeyRound, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import BrandIcon from "@/components/ui/BrandIcon";
import { PasswordInput } from "@/components/ui/password-input";
import type { WorkspaceRole } from "@/lib/auth/roles";

export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<WorkspaceRole | "">("");
  const [formData, setFormData] = useState({
    workspace: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // OTP Verification state
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (!pendingVerification || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingVerification, timeLeft]);

  // Focus first OTP input when screen transitions
  useEffect(() => {
    if (pendingVerification) {
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    }
  }, [pendingVerification]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSignupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (accountType !== "ADMIN") return;
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountType,
          workspace: formData.workspace,
          name: formData.name || undefined,
          email: formData.email,
          password: formData.password,
        }),
      });

      const payload = await response.json().catch(() => null) as {
        success?: boolean;
        requiresVerification?: boolean;
        email?: string;
        message?: string;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Workspace provisioning failed.");
      }

      if (payload.requiresVerification) {
        setPendingVerification(true);
        setVerificationEmail(payload.email || formData.email);
        setTimeLeft(600);
        setNotice(payload.message || "A 6-digit verification code has been dispatched to your email address.");
      } else {
        router.replace("/admin");
        router.refresh();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Workspace provisioning failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    // Single digit or paste
    if (cleaned.length === 1) {
      const newDigits = [...otpDigits];
      newDigits[index] = cleaned;
      setOtpDigits(newDigits);
      if (index < 5) {
        otpInputsRef.current[index + 1]?.focus();
      }
    } else if (cleaned.length >= 6) {
      // User pasted full code
      const pasted = cleaned.slice(0, 6).split("");
      setOtpDigits(pasted);
      otpInputsRef.current[5]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text/plain").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    const nextIdx = Math.min(pasted.length, 5);
    otpInputsRef.current[nextIdx]?.focus();
  };

  const handleVerifyOtp = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: verificationEmail,
          otp,
        }),
      });

      const payload = await response.json().catch(() => null) as {
        success?: boolean;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Invalid or expired verification code.");
      }

      setIsVerifiedSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || timeLeft > 540) return;
    setResending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const payload = await response.json().catch(() => null) as {
        success?: boolean;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Failed to resend code.");
      }

      setTimeLeft(600);
      setNotice("A new 6-digit verification code has been dispatched.");
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const inputCls = "w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans shadow-2xs";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5 tracking-wider uppercase font-sans";

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
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
            {isVerifiedSuccess
              ? "Account Activated"
              : pendingVerification
              ? "Email Verification"
              : "Enterprise Workspace Setup"}
          </p>
        </div>

        {/* ============================================================== */}
        {/* SUCCESS / OTP VERIFICATION / INITIAL SIGNUP SCREENS           */}
        {/* ============================================================== */}
        {isVerifiedSuccess ? (
          <div className="space-y-6 text-center animate-in fade-in duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 shadow-xs">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
                Account Verified Successfully!
              </h1>
              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                Your email <strong className="text-slate-900">{verificationEmail}</strong> has been confirmed and your enterprise workspace is fully provisioned.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>WORKSPACE READY & ACTIVE</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed font-sans">
                Your credentials have been securely stored. Please proceed to the login page to sign in with your password and start working.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-left text-slate-600 font-sans space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Workspace:</span>
                <span className="font-semibold text-slate-800">{formData.workspace || "Primary Workspace"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Assigned Role:</span>
                <span className="font-semibold text-slate-800">Company Administrator</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold text-slate-800">{verificationEmail}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Status:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Verified & Ready
                </span>
              </div>
            </div>

            <Link
              href={`/login?email=${encodeURIComponent(verificationEmail)}&role=ADMIN&verified=true`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3.5 text-sm font-bold tracking-wider uppercase text-white shadow-sm transition-colors cursor-pointer"
            >
              <span>GO TO LOGIN & START WORKING</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : pendingVerification ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-blue-600">
                <Mail className="h-6 w-6" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 font-sans">Verify Your Email</h1>
              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                We sent a 6-digit security code to<br />
                <strong className="text-slate-900">{verificationEmail}</strong>
              </p>
            </div>

            {notice && (
              <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 font-sans">
                {notice}
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-sans">
                {error}
              </p>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* 6-Cell Verification Code Input */}
              <div>
                <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3 font-sans">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-between gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputsRef.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="h-13 w-12 text-center text-xl font-bold font-mono text-slate-900 border border-slate-300 rounded-lg bg-white shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Countdown & Resend */}
              <div className="flex items-center justify-between text-xs font-sans text-slate-500 px-1">
                <span className={timeLeft === 0 ? "text-red-600 font-semibold" : ""}>
                  Expires in: <strong className="font-mono text-slate-700">{formatTimer(timeLeft)}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending || timeLeft > 540}
                  className="font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:hover:text-blue-600 cursor-pointer transition-colors"
                >
                  {resending ? "Sending…" : "Resend code"}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || otpDigits.join("").length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? "VERIFYING & PROVISIONING…" : "VERIFY & ACTIVATE WORKSPACE"}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setPendingVerification(false);
                  setError(null);
                  setNotice(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" /> Back to edit registration details
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* INITIAL SIGNUP FORM                                            */
          /* ============================================================== */
          <>
            {/* Role selector */}
            <div>
              <label className={labelCls}>Choose your role</label>
              <select
                aria-label="Signup role"
                value={accountType}
                onChange={(event) => { setAccountType(event.target.value as WorkspaceRole | ""); setError(null); }}
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
                    Agent accounts are managed by your company Administrator. Ask your Administrator to invite you, then click the invitation link to set up your account.
                  </p>
                </div>
                <Link href="/login" className="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50">
                  CONTINUE TO LOGIN <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {accountType === "ADMIN" && (
              <>
                <div className="text-center space-y-1">
                  <Building2 className="mx-auto h-6 w-6 text-violet-500" />
                  <h1 className="text-lg font-bold text-slate-900 font-sans">Create Company Admin</h1>
                  <p className="text-xs text-slate-500 font-sans">Provision a new company workspace and its first Administrator</p>
                </div>

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div>
                    <label className={labelCls}>Workspace title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Sales Corp"
                      value={formData.workspace}
                      onChange={(e) => setFormData({ ...formData, workspace: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Administrator Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe (letters only)"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Email address</label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="admin@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-3">
                    <PasswordInput
                      label="Password"
                      required
                      autoComplete="new-password"
                      placeholder="Min 8 chars with upper, lower, num & symbol"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />

                    <PasswordInput
                      label="Confirm Password"
                      required
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 font-sans">
                    <span className="font-semibold text-slate-700">Password requirements:</span> Min 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol (@$!%*?&#).
                  </div>

                  {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-sans">{error}</p>}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isLoading ? "DISPATCHING VERIFICATION CODE…" : "PROCEED TO EMAIL VERIFICATION"}</span>
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
          </>
        )}
      </div>
    </div>
  );
}
