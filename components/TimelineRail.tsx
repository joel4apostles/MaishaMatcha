"use client";

import { useEffect, useRef } from "react";

/**
 * Self-drawing timeline rail: a faint hairline is always present (no-JS
 * fallback); a stronger wood-tone line grows down it as the reader scrolls.
 * Scroll-linked (not looping), honors prefers-reduced-motion by staying full.
 */
export function TimelineRail({ className = "" }: { className?: string }) {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    const rail = line?.parentElement;
    if (!line || !rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      line.style.transform = "scaleY(1)";
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = rail.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(
        1,
        Math.max(0, (vh * 0.7 - rect.top) / rect.height),
      );
      line.style.transform = `scaleY(${progress})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-0 left-0 top-0 w-px ${className}`.trim()}
    >
      {/* static faint rail */}
      <div className="absolute inset-0 bg-wood/25" />
      {/* drawn line */}
      <div
        ref={lineRef}
        className="absolute inset-0 origin-top bg-wood"
        style={{ transform: "scaleY(0)" }}
      />
    </div>
  );
}
