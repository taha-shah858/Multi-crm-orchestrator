"use client";

import React from "react";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Retained for prop compatibility — no longer applied. */
  glareOpacity?: number;
  tiltMaxAngleX?: number;
  tiltMaxAngleY?: number;
}

/**
 * TiltCard — enterprise flat replacement.
 * 3D tilt physics, perspective transforms, and glare overlays have been
 * removed. The component now renders a clean opaque enterprise card that
 * accepts the same props so all call-sites compile without changes.
 */
export function TiltCard({
  children,
  className = "",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  glareOpacity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tiltMaxAngleX,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tiltMaxAngleY,
  ...props
}: TiltCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
