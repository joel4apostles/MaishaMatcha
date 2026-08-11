import { Fragment, type CSSProperties } from "react";

/**
 * Per-word staggered entrance (fade + 12px rise + blur settle), CSS-only so it
 * runs without JS and is disabled under prefers-reduced-motion (globals.css).
 * Server-safe: renders spans with per-word animation delays.
 */
export function WordReveal({
  text,
  baseDelay = 0,
  step = 90,
  className = "",
}: {
  text: string;
  /** ms before the first word appears */
  baseDelay?: number;
  /** ms between words */
  step?: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={`word-rise ${className}`.trim()}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span
            style={
              { "--wr-delay": `${baseDelay + i * step}ms` } as CSSProperties
            }
          >
            {word}
          </span>
          {/* Space OUTSIDE the inline-block span; inside it gets trimmed. */}
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
