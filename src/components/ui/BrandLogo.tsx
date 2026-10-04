import type { SVGProps } from "react";

interface BrandLogoProps {
  /** Icon diameter in px. Default 32. */
  size?: number;
  /** Show the UNISYNC wordmark beside the icon. Default true. */
  showText?: boolean;
  /** Extra Tailwind / class string applied to the root wrapper. */
  className?: string;
}

/**
 * UNISYNC brand logo — interlocking orbital arcs converging on a
 * central AI diamond node.
 *
 * Color: Electric Cyan (#06B6D4) ↔ Hyper Violet (#8B5CF6) gradient,
 * safe across dark, light, and glassmorphic backgrounds.
 *
 * Props: size, showText, className
 */
export default function BrandLogo({
  size = 32,
  showText = true,
  className = "",
}: BrandLogoProps) {
  // All SVG geometry is defined in a 64×64 viewport, then scaled via size.
  const vb = 64;
  // Unique prefix avoids gradient-id collisions when multiple instances render.
  const uid = "unisync";

  return (
    <div
      className={`flex items-center gap-2.5 select-none ${className}`}
      aria-label="UNISYNC CRM Orchestrator"
    >
      {/* ── SVG Icon ── */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${vb} ${vb}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Primary gradient: cyan → violet */}
          <linearGradient id={`${uid}-g1`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          {/* Accent gradient: violet → cyan (reversed, for secondary arcs) */}
          <linearGradient id={`${uid}-g2`} x1="64" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          {/* Glow filter for diamond node */}
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft drop shadow for arcs */}
          <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Orbital arc 1 (HubSpot – outer top-left sweep) ── */}
        <path
          d="M 10 32 A 22 22 0 0 1 32 10"
          stroke={`url(#${uid}-g1)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
          filter={`url(#${uid}-shadow)`}
        />

        {/* ── Orbital arc 2 (Zoho – outer bottom-right sweep) ── */}
        <path
          d="M 54 32 A 22 22 0 0 1 32 54"
          stroke={`url(#${uid}-g2)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
          filter={`url(#${uid}-shadow)`}
        />

        {/* ── Orbital arc 3 (ClickUp – mid diagonal sweep) ── */}
        <path
          d="M 14 18 A 26 26 0 0 0 50 46"
          stroke={`url(#${uid}-g1)`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="4 3"
          opacity="0.65"
        />

        {/* ── Orbital arc 4 (counter diagonal, depth layer) ── */}
        <path
          d="M 50 18 A 26 26 0 0 1 14 46"
          stroke={`url(#${uid}-g2)`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="3 4"
          opacity="0.50"
        />

        {/* ── Orbit ring (thin full circle) ── */}
        <circle
          cx="32"
          cy="32"
          r="20"
          stroke={`url(#${uid}-g1)`}
          strokeWidth="0.8"
          opacity="0.25"
        />

        {/* ── Three satellite dots (CRM nodes) ── */}
        {/* Top node – HubSpot */}
        <circle cx="32" cy="12" r="2.8" fill="#06B6D4" opacity="0.85" />
        {/* Bottom-left node – Zoho */}
        <circle cx="14.4" cy="44" r="2.4" fill="#6366F1" opacity="0.85" />
        {/* Bottom-right node – ClickUp */}
        <circle cx="49.6" cy="44" r="2.4" fill="#8B5CF6" opacity="0.85" />

        {/* ── Connector spokes from diamond to satellite nodes ── */}
        <line x1="32" y1="26" x2="32" y2="14.8" stroke={`url(#${uid}-g1)`} strokeWidth="0.9" opacity="0.5" />
        <line x1="27.5" y1="35" x2="16.4" y2="43.2" stroke={`url(#${uid}-g2)`} strokeWidth="0.9" opacity="0.5" />
        <line x1="36.5" y1="35" x2="47.6" y2="43.2" stroke={`url(#${uid}-g1)`} strokeWidth="0.9" opacity="0.5" />

        {/* ── Central AI diamond node ── */}
        {/* Glow backdrop */}
        <polygon
          points="32,19 39,32 32,45 25,32"
          fill={`url(#${uid}-g1)`}
          opacity="0.15"
          filter={`url(#${uid}-glow)`}
        />
        {/* Outer diamond frame */}
        <polygon
          points="32,20 40,32 32,44 24,32"
          stroke={`url(#${uid}-g1)`}
          strokeWidth="1.5"
          fill="none"
          opacity="0.7"
        />
        {/* Inner diamond fill */}
        <polygon
          points="32,23 37.5,32 32,41 26.5,32"
          fill={`url(#${uid}-g1)`}
          opacity="0.9"
          filter={`url(#${uid}-glow)`}
        />
        {/* Diamond highlight facet */}
        <polygon
          points="32,23 37.5,32 32,32"
          fill="white"
          opacity="0.18"
        />
        {/* Center spark */}
        <circle cx="32" cy="32" r="2" fill="white" opacity="0.9" filter={`url(#${uid}-glow)`} />
      </svg>

      {/* ── Wordmark ── */}
      {showText && (
        <div className="flex flex-col leading-none overflow-hidden">
          <span
            className="font-bold tracking-[0.14em] uppercase"
            style={{
              fontSize: Math.max(10, size * 0.38),
              background: "linear-gradient(90deg, #06B6D4, #8B5CF6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            UNISYNC
          </span>
          <span
            className="font-sans font-medium uppercase tracking-widest text-slate-500"
            style={{ fontSize: Math.max(7, size * 0.22) }}
          >
            CRM Orchestrator
          </span>
        </div>
      )}
    </div>
  );
}
