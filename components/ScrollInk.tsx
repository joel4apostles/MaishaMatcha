"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-linked ink reveal: words render faint and turn to full ink as the
 * reader scrolls through the block. Direct DOM writes inside rAF (no
 * re-renders). SSR/no-JS renders full ink; reduced motion keeps full ink.
 */
export function ScrollInk({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const words = Array.from(el.querySelectorAll<HTMLSpanElement>("span"));
    if (words.length === 0) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Progress 0..1 while the block travels the middle band of the viewport.
      const start = vh * 0.85;
      const end = vh * 0.35;
      const progress = Math.min(
        1,
        Math.max(0, (start - rect.top) / (start - end + rect.height)),
      );
      const revealed = Math.floor(progress * words.length);
      words.forEach((w, i) => {
        w.style.opacity = i < revealed ? "1" : "0.35";
      });
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
  }, [text]);

  return (
    <p ref={ref} className={className}>
      {text.split(" ").map((word, i, arr) => (
        <span
          key={`${word}-${i}`}
          className="transition-opacity duration-300 ease-out"
        >
          {word}
          {i < arr.length - 1 ? " " : null}
        </span>
      ))}
    </p>
  );
}
