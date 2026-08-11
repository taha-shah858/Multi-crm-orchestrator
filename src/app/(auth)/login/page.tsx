"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, ArrowRight, Lock } from "lucide-react";
import { MultiCrmCard } from "@/components/ui/MultiCrmCard";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("operator@zenith.core");
  const [password, setPassword] = useState("");
  const [statelessSession, setStatelessSession] = useState(true);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Set the session cookie required by the middleware proxy
    document.cookie = "multi_crm_session=active; path=/; max-age=86400";
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none translate-x-32 translate-y-32" />

      <MultiCrmCard className="w-full max-w-md p-8 space-y-8 relative z-10 border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl shadow-2xl">
        {/* Header Logo & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs shadow-inner">
            <Shield className="w-4 h-4" />
            <span>MULTI-CRM ORCHESTRATOR</span>
          </div>
          <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
            Secure Vault Authentication
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-medium text-slate-300 tracking-wider">
              EMAIL
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500/60 transition-all shadow-inner"
              />
              <span className="absolute right-3.5 top-3.5 text-slate-500 font-mono text-xs">
                @
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-medium text-slate-300 tracking-wider">
                PASSWORD
              </label>
              <a
                href="#forgot"
                className="text-[10px] font-mono text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
              >
                FORGOT PASSWORD?
              </a>
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500/60 transition-all shadow-inner"
              />
              <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Stateless Session Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div>
              <p className="text-xs font-medium text-slate-200">
                Stateless Client Session
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Wipe Cache on Logout
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStatelessSession(!statelessSession)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                statelessSession ? "bg-cyan-500" : "bg-slate-800"
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  statelessSession ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold text-xs font-mono tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)]"
          >
            <span>AUTHENTICATE & OPEN VAULT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2">
          <a
            href="/signup"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            Create an Agent Account <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </MultiCrmCard>
    </div>
  );
}
