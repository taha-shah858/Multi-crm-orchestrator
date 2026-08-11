"use client";

import React, { useRef, useState } from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export default function GlassCard({
  children,
  className = "",
  glowColor = "rgba(6, 182, 212, 0.18)", // Matches your primary cyan theme
  style,
  ...props
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [transformStyle, setTransformStyle] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    // Calculate smooth 3D tilt rotation angles (-5.5deg to 5.5deg)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5.5;
    const rotateY = ((x - centerX) / centerX) * 5.5;

    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX.toFixed(
        2
      )}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`
    );
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
    );
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: isHovered
          ? "transform 0.08s ease-out, box-shadow 0.2s ease"
          : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s ease",
        backgroundColor:
          "color-mix(in srgb, var(--color-crm-surface, #020617) 45%, transparent)",
        ...style, // Merges custom inline styles passed from parent components
      }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 p-6 backdrop-blur-xl shadow-2xl ${
        isHovered
          ? "shadow-[0_0_25px_color-mix(in_srgb,var(--color-primary-cyan)_15%,transparent)] border-primary-cyan/40"
          : "shadow-black/60 border-white/10"
      } ${className}`}
      {...props}
    >
      {/* Dynamic Mouse-Following Glow Layer */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(450px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 70%)`,
          }}
        />
      )}

      {/* Content Container */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
