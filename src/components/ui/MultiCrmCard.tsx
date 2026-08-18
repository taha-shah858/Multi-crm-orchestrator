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
      className={`bg-crm-card/90 border border-crm-border rounded-2xl p-6 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-primary-cyan/5 relative overflow-hidden transition-all duration-300 ${className}`}
      {...props}
    >
      {/* True glassmorphism inner reflection / 1px highlight */}
      <div className="absolute inset-0 rounded-2xl border border-crm-border pointer-events-none" style={{ mixBlendMode: 'overlay' }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary-cyan/20 to-transparent pointer-events-none" />
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
      className={`bg-crm-inner/80 border border-crm-border rounded-xl p-4 transition-all duration-300 shadow-inner ${className}`}
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
    cyan: "bg-primary-cyan/10 text-primary-cyan border-primary-cyan/20",
    magenta: "bg-secondary-pink/10 text-secondary-pink border-secondary-pink/20",
    purple: "bg-tertiary-purple/10 text-tertiary-purple border-tertiary-purple/20",
    neutral: "bg-crm-surface/60 text-crm-text-muted border-crm-border/60",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono border font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
