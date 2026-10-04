import React from "react";

interface MultiCrmCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/** Enterprise flat card — white bg, subtle slate border, minimal shadow. */
export function MultiCrmCard({
  children,
  className = "",
  ...props
}: MultiCrmCardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-sm p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/** Enterprise inner panel — light slate surface inside a card. */
export function MultiCrmInnerPanel({
  children,
  className = "",
  ...props
}: MultiCrmCardProps) {
  return (
    <div
      className={`bg-slate-50 border border-slate-200 rounded-md p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/** Enterprise status tag / badge. */
export function MultiCrmTag({
  children,
  variant = "cyan",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "cyan" | "magenta" | "purple" | "neutral";
  className?: string;
}) {
  const variants: Record<string, string> = {
    cyan:    "bg-blue-50  text-blue-700  border border-blue-200",
    magenta: "bg-violet-50 text-violet-700 border border-violet-200",
    purple:  "bg-violet-50 text-violet-700 border border-violet-200",
    neutral: "bg-slate-100 text-slate-600  border border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${variants[variant] ?? variants.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
