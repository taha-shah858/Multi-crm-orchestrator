import React from "react";

interface ZenithCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main Zenith Outer Chassis
 * Uses Obsidian base (#121827), high-contrast Cyan border top-rim highlight,
 * and deep shadow elevation to block background node bleeding.
 */
export function ZenithCard({
  children,
  className = "",
  ...props
}: ZenithCardProps) {
  return (
    <div
      className={`relative rounded-2xl bg-zenith-surface border border-primary-cyan/25 border-t-primary-cyan/50 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),0_0_20px_rgba(0,242,255,0.06)] transition-all duration-300 hover:border-primary-cyan/50 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),0_0_25px_rgba(0,242,255,0.15)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Zenith Pitch-Black Inner Panel
 * Embedded inside ZenithCard for nested content, metrics, or speech blocks (#0F1420).
 */
export function ZenithInnerPanel({
  children,
  className = "",
  ...props
}: ZenithCardProps) {
  return (
    <div
      className={`rounded-xl bg-zenith-inner border border-slate-800/80 p-4 shadow-inner ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Zenith Monospaced Category Tag
 */
export function ZenithTag({
  children,
  variant = "cyan",
}: {
  children: React.ReactNode;
  variant?: "cyan" | "magenta" | "purple" | "neutral";
}) {
  const styles = {
    cyan: "text-primary-cyan border-primary-cyan/30 bg-primary-cyan/10",
    magenta:
      "text-secondary-pink border-secondary-pink/30 bg-secondary-pink/10",
    purple:
      "text-tertiary-purple border-tertiary-purple/30 bg-tertiary-purple/10",
    neutral: "text-slate-400 border-slate-700 bg-slate-800/50",
  }[variant];

  return (
    <span
      className={`font-mono text-[10px] tracking-widest font-bold uppercase px-2 py-0.5 rounded border ${styles}`}
    >
      {children}
    </span>
  );
}
