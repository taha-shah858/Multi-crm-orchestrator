"use client";

import React, { useRef, useState } from "react";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glareOpacity?: number;
  tiltMaxAngleX?: number;
  tiltMaxAngleY?: number;
}

export function TiltCard({
  children,
  className = "",
  glareOpacity = 0.2,
  tiltMaxAngleX = 10,
  tiltMaxAngleY = 10,
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
  );
  const [glareStyle, setGlareStyle] = useState({
    opacity: 0,
    x: "50%",
    y: "50%",
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Mouse coordinates relative to card center (-1 to 1)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPercentage = mouseX / width;
    const yPercentage = mouseY / height;

    const rotateX = ((yPercentage - 0.5) * -2 * tiltMaxAngleX).toFixed(2);
    const rotateY = ((xPercentage - 0.5) * 2 * tiltMaxAngleY).toFixed(2);

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    );
    setGlareStyle({
      opacity: glareOpacity,
      x: `${xPercentage * 100}%`,
      y: `${yPercentage * 100}%`,
    });
  };

  const handlePointerLeave = () => {
    setTransform(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
    );
    setGlareStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform,
        transition: "transform 0.15s cubic-bezier(0.03, 0.98, 0.52, 0.99)",
        transformStyle: "preserve-3d",
      }}
      /* Baseline theme updated: High contrast bg, top-lit border, deep black drop shadow */
      className={`relative overflow-hidden rounded-2xl bg-crm-inner/80 backdrop-blur-md border border-crm-border border-t-slate-700/60 shadow-2xl shadow-black/60 hover:border-crm-border/80 transition-colors ${className}`}
      {...props}
    >
      {/* 1. Specular Glare / Light Sweep Across Card Surface */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-10"
        style={{
          opacity: glareStyle.opacity,
          background: `radial-gradient(circle at ${glareStyle.x} ${glareStyle.y}, rgba(255, 255, 255, 0.25) 0%, rgba(255,255,255,0) 70%)`,
        }}
      />

      {/* 2. Interactive Glowing Border Reflection */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 z-20"
        style={{
          opacity: glareStyle.opacity ? 1 : 0,
          background: `radial-gradient(350px circle at ${glareStyle.x} ${glareStyle.y}, rgba(6, 182, 212, 0.5), transparent 80%)`,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />

      {/* 3. Card Content elevated on Z-axis for 3D parallax effect */}
      <div
        className="relative z-0 h-full w-full"
        style={{ transform: "translateZ(25px)" }}
      >
        {children}
      </div>
    </div>
  );
}
