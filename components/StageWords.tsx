import type { CSSProperties } from "react";

/**
 * Per-word markup for a StageReveal title: words carry staggered delays but
 * only animate once the parent stage fires `.in` (see globals.css).
 * Server-safe; renders plain visible text without JS.
 */
export function StageWords({
  text,
  baseDelay = 150,
  step = 70,
  className = "",
}: {
  text: string;
  baseDelay?: number;
  step?: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={`stage-words ${className}`.trim()}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{ "--wr-delay": `${baseDelay + i * step}ms` } as CSSProperties}
        >
          {word}
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
