"use client";

import React from "react";

/**
 * AmbientBackground — enterprise no-op replacement.
 * The canvas particle loop has been replaced with a clean static
 * light neutral background so the app canvas is performant and
 * readable on any display without any animation overhead.
 */
export default function AmbientBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-slate-50"
      aria-hidden="true"
    />
  );
}
