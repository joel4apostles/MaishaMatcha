/**
 * The one signature motif: a fine kigumi lattice (wood-tone, ≤ 8% opacity).
 * Brand law limits this to ONE hero element per page. Purely decorative.
 */
export function KigumiGrid({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern
          id="kigumi-lattice"
          width="46"
          height="46"
          patternUnits="userSpaceOnUse"
        >
          {/* orthogonal frame + interlocking half-squares */}
          <path
            d="M0 0 H46 M0 0 V46 M0 23 H46 M23 0 V46 M11.5 11.5 H34.5 V34.5 H11.5 Z"
            fill="none"
            stroke="var(--color-wood)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kigumi-lattice)" />
    </svg>
  );
}
