"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Dramatic staged entrance for story chapters. On mount (JS only) the block
 * is armed with the `.stage` class — children marked [data-s] and any
 * `.stage-words` spans hide. When the block scrolls into the reading band,
 * `.in` fires the sequence: elements rise in the order of their --sd delays,
 * words assemble via word-rise. Runs once. No-JS and reduced-motion users
 * always see full content (globals.css).
 */
export function StageReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already in the upper half of the viewport on load — don't hide it.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.55) return;

    el.classList.add("stage");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("in");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
