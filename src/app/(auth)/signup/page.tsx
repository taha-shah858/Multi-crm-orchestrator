"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, ArrowLeft } from "lucide-react";
// Instead of "@/components/ui/MultiCrmCard"
import { MultiCrmCard } from "../../../components/ui/MultiCrmCard";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    workspace: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Set session cookie required by proxy middleware
    document.cookie = "multi_crm_session=active; path=/; max-age=86400";
    setTimeout(() => {
      setIsLoading(false);
      router.push("/");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none translate-x-32 translate-y-32" />

      <MultiCrmCard className="w-full max-w-md p-8 space-y-6 relative z-10 border-cyan-500/20 bg-crm-base/80 backdrop-blur-xl shadow-2xl">
        {/* Header Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs shadow-inner">
            <Shield className="w-4 h-4" />
            <span>MULTI-CRM ORCHESTRATOR</span>
          </div>
          <p className="text-[10px] font-mono tracking-widest text-crm-text-muted uppercase">
            Secure Vault Authentication
          </p>
        </div>

        {/* Title Section */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-crm-text uppercase font-serif">
            Create Agent Account
          </h1>
          <p className="text-xs text-crm-text-muted font-mono">
            Set Up Your Local Independent CRM Workspace Profile
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-cyan-400 tracking-wider">
              WORKSPACE TITLE
            </label>
            <input
              type="text"
              required
              value={formData.workspace}
              onChange={(e) =>
                setFormData({ ...formData, workspace: e.target.value })
              }
              className="w-full bg-crm-inner/90 border border-crm-border rounded-xl px-4 py-3 text-xs text-crm-text font-mono focus:outline-none focus:border-cyan-500/60 transition-all shadow-inner"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-cyan-400 tracking-wider">
              EMAIL
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full bg-crm-inner/90 border border-crm-border rounded-xl px-4 py-3 text-xs text-crm-text font-mono focus:outline-none focus:border-cyan-500/60 transition-all shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-semibold text-cyan-400 tracking-wider">
                PASSWORD
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full bg-crm-inner/90 border border-crm-border rounded-xl px-4 py-3 text-xs text-crm-text font-mono focus:outline-none focus:border-cyan-500/60 transition-all shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-semibold text-cyan-400 tracking-wider">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full bg-crm-inner/90 border border-crm-border rounded-xl px-4 py-3 text-xs text-crm-text font-mono focus:outline-none focus:border-cyan-500/60 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold text-xs font-mono tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)] mt-2"
          >
            {isLoading ? (
              <span className="animate-pulse">PROVISIONING WORKSPACE...</span>
            ) : (
              <>
                <span>COMPLETE SIGNUP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={() => {
              document.cookie =
                "multi_crm_session=active; path=/; max-age=86400";
              router.push("/");
            }}
            className="w-full py-3 px-4 rounded-xl bg-crm-inner/90 border border-crm-border text-crm-text hover:bg-crm-inner hover:border-crm-border font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-inner"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.4 0 10.1 0 12s.6 3.6 1.6 5.6l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 15c1.9 3.8 5.8 6.4 10.4 6.4z"
              />
            </svg>
            <span>SIGN IN WITH GOOGLE</span>
          </button>
        </form>

        {/* Footer Back Link */}
        <div className="text-center pt-2 border-t border-crm-border">
          <Link
            href="/login"
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" /> RETURN TO SECURE VAULT LOGIN
          </Link>
        </div>
      </MultiCrmCard>
    </div>
  );
}
