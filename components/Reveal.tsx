"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Phase = "static" | "hidden" | "in";

/**
 * Fade-and-rise on scroll. Brand law: 12px rise, 0.6s ease-out, once.
 *
 * SSR renders content fully visible, so no-JS and above-the-fold content is
 * never hidden. On mount (JS only), below-the-fold elements are set to the
 * hidden state and revealed once when they enter the viewport. Honors
 * prefers-reduced-motion by staying visible.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Already in view on load (e.g. hero) — do not animate.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;

    setPhase("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setPhase("in");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const motion =
    phase === "static"
      ? ""
      : phase === "hidden"
        ? "translate-y-3 opacity-0 transition-[opacity,transform] duration-[600ms] ease-out"
        : "translate-y-0 opacity-100 transition-[opacity,transform] duration-[600ms] ease-out";

  return (
    <div
      ref={ref}
      className={`${className} ${motion}`.trim()}
      style={phase === "in" && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
