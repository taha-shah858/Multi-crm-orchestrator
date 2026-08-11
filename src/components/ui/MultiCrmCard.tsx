import React from "react";

interface MultiCrmCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function MultiCrmCard({
  children,
  className = "",
  ...props
}: MultiCrmCardProps) {
  return (
    <div
      className={`bg-zenith-base/90 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Subtle top inner highlight line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

export function MultiCrmInnerPanel({
  children,
  className = "",
  ...props
}: MultiCrmCardProps) {
  return (
    <div
      className={`bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function MultiCrmTag({
  children,
  variant = "cyan",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "cyan" | "magenta" | "purple" | "neutral";
  className?: string;
}) {
  const variants = {
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    magenta: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    neutral: "bg-slate-800/60 text-slate-300 border-slate-700/60",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
