/**
 * BrandIcon — AI Orchestration Node SVG icon.
 *
 * Three orbital curves converging on a central geometric core node.
 * Gradient: Electric Cyan (#06B6D4) → Indigo (#6366F1).
 * Safe across dark, light, and glassmorphic backgrounds.
 *
 * Props:
 *   size      — diameter in px (default 32)
 *   className — extra class string applied to the <svg> element
 */
export default function BrandIcon({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // All geometry is defined in a 40×40 viewport and scaled via width/height.
  // Unique ID prefix prevents filter/gradient ID collisions when multiple
  // instances are rendered on the same page.
  const id = "bi";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        {/* Primary: cyan → indigo */}
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Accent: indigo → cyan (reversed for variety on secondary arcs) */}
        <linearGradient id={`${id}-b`} x1="40" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Soft glow for the core diamond */}
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Orbital arc 1: top-left sweep ── */}
      <path
        d="M 7 20 A 13 13 0 0 1 20 7"
        stroke={`url(#${id}-a)`}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* ── Orbital arc 2: bottom-right sweep ── */}
      <path
        d="M 33 20 A 13 13 0 0 1 20 33"
        stroke={`url(#${id}-b)`}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* ── Orbital arc 3: diagonal cross sweep ── */}
      <path
        d="M 9 11 A 16 16 0 0 0 31 29"
        stroke={`url(#${id}-a)`}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="3.5 2.5"
        opacity="0.6"
      />

      {/* ── Thin full orbit ring (depth) ── */}
      <circle
        cx="20" cy="20" r="12"
        stroke={`url(#${id}-a)`}
        strokeWidth="0.6"
        opacity="0.2"
      />

      {/* ── Three satellite CRM nodes ── */}
      <circle cx="20" cy="7"  r="2"   fill="#06B6D4" opacity="0.85" />
      <circle cx="9"  cy="27" r="1.7" fill="#6366F1" opacity="0.85" />
      <circle cx="31" cy="27" r="1.7" fill="#818CF8" opacity="0.85" />

      {/* ── Spokes from diamond centre to satellites ── */}
      <line x1="20" y1="16" x2="20" y2="9"   stroke={`url(#${id}-a)`} strokeWidth="0.7" opacity="0.45" />
      <line x1="17" y1="22" x2="10" y2="26"  stroke={`url(#${id}-b)`} strokeWidth="0.7" opacity="0.45" />
      <line x1="23" y1="22" x2="30" y2="26"  stroke={`url(#${id}-a)`} strokeWidth="0.7" opacity="0.45" />

      {/* ── Central diamond glow backdrop ── */}
      <polygon
        points="20,12 25,20 20,28 15,20"
        fill={`url(#${id}-a)`}
        opacity="0.12"
        filter={`url(#${id}-glow)`}
      />

      {/* ── Diamond frame ── */}
      <polygon
        points="20,13 25.5,20 20,27 14.5,20"
        stroke={`url(#${id}-a)`}
        strokeWidth="1.2"
        fill="none"
        opacity="0.75"
      />

      {/* ── Diamond fill ── */}
      <polygon
        points="20,15 24,20 20,25 16,20"
        fill={`url(#${id}-a)`}
        opacity="0.88"
        filter={`url(#${id}-glow)`}
      />

      {/* ── Highlight facet ── */}
      <polygon
        points="20,15 24,20 20,20"
        fill="white"
        opacity="0.2"
      />

      {/* ── Centre spark ── */}
      <circle cx="20" cy="20" r="1.4" fill="white" opacity="0.92" filter={`url(#${id}-glow)`} />
    </svg>
  );
}
