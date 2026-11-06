import type { ReactNode } from "react";
import { Numeral } from "./Numeral";

/**
 * Small-caps eyebrow: 0.75rem, 0.15em tracking. Quiet, never an accent color.
 */
export function Eyebrow({
  children,
  id,
  className = "",
  numeral,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  /** A kanji numeral (一 二 三) in the brush face, marking a step in a page's path. */
  numeral?: string;
}) {
  return (
    <p
      id={id}
      className={`text-eyebrow font-medium uppercase text-sumi/70 ${numeral ? "flex items-center gap-3" : ""} ${className}`.trim()}
    >
      {numeral ? (
        <Numeral>{numeral}</Numeral>
      ) : null}
      {numeral ? <span>{children}</span> : children}
    </p>
  );
}
