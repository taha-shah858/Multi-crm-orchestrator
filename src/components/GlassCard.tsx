"use client";

import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Retained for prop compatibility — no longer applied. */
  glowColor?: string;
}

/**
 * GlassCard — enterprise flat replacement.
 * Mouse-tracking glow, 3D tilt transforms, and backdrop-blur effects
 * have been removed. The component now renders a clean opaque enterprise
 * card surface. All existing props are retained so call-sites compile
 * without changes.
 */
export default function GlassCard({
  children,
  className = "",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  glowColor,
  style,
  ...props
}: GlassCardProps) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-shadow duration-150 p-6 ${className}`}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
