"use client";

import { useEffect, useRef } from "react";

export function AmbientBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      containerRef.current.style.setProperty("--mouse-x", `${clientX}px`);
      containerRef.current.style.setProperty("--mouse-y", `${clientY}px`);
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={
        {
          "--mouse-x": "50vw",
          "--mouse-y": "50vh",
        } as React.CSSProperties
      }
    >
      {/* 1. Blended Network Node Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-screen filter saturate-150 blur-[0.5px]"
        style={{
          backgroundImage: `url('/bg-network.jpg')`,
          maskImage: `radial-gradient(ellipse at center, black 30%, transparent 85%)`,
          WebkitMaskImage: `radial-gradient(ellipse at center, black 30%, transparent 85%)`,
        }}
      />

      {/* 2. Dynamic Cursor Interactive Glow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-60 transition-opacity duration-300"
        style={{
          background: `radial-gradient(650px circle at var(--mouse-x) var(--mouse-y), rgba(225, 29, 72, 0.15), rgba(6, 182, 212, 0.1) 40%, transparent 80%)`,
        }}
      />

      {/* 3. Subtle Grain / Noise Overlay for Depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
