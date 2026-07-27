"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Building,
  ArrowRight,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  ZenithCard,
  ZenithInnerPanel,
  ZenithTag,
} from "@/components/ui/ZenithCard";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = "/";
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-primary-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-zenith-surface border border-accent-violet/30 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-6 h-6 text-accent-violet animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Provision <span className="text-accent-violet">Zenith</span> Node
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Setup multi-CRM ingestion workspace & AI copilot pipelines.
          </p>
        </div>

        {/* Signup Card */}
        <ZenithCard className="p-8 space-y-6 shadow-2xl border-accent-violet/20">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-200">
              Operator Registration
            </h2>
            <p className="text-[11px] font-mono text-slate-500">
              Configure your master administrator credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent-violet" /> Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Sarah Jenkins"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-zenith-inner border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-violet/50 font-mono transition-all shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-accent-violet" /> Work Email
              </label>
              <input
                type="email"
                required
                placeholder="s.jenkins@acmeproviders.io"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full bg-zenith-inner border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-violet/50 font-mono transition-all shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-accent-violet" />{" "}
                Organization / Workspace
              </label>
              <input
                type="text"
                required
                placeholder="Acme Enterprise"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                className="w-full bg-zenith-inner border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-violet/50 font-mono transition-all shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent-violet" /> Master
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full bg-zenith-inner border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-violet/50 font-mono transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-xs bg-linear-to-r from-primary-cyan to-accent-violet text-slate-950 font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:opacity-95 transition-all mt-2"
            >
              {isLoading ? (
                <span className="font-mono animate-pulse">
                  Provisioning Enterprise Node...
                </span>
              ) : (
                <>
                  <span>Create Workspace & Connect CRMs</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <ZenithInnerPanel className="flex items-center justify-between text-[11px] font-mono text-slate-500 py-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent-violet" /> 5 CRM
              Connectors Ready
            </span>
            <ZenithTag variant="purple">Trial Node</ZenithTag>
          </ZenithInnerPanel>
        </ZenithCard>

        {/* Footer Link to Login */}
        <p className="text-center text-xs font-mono text-slate-500">
          Already have a workspace?{" "}
          <Link
            href="/login"
            className="text-accent-violet hover:underline font-semibold"
          >
            Authenticate
          </Link>
        </p>
      </div>
    </div>
  );
}
