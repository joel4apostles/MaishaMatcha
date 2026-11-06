import type { ReactNode } from "react";

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
      className={`text-eyebrow font-medium uppercase text-sumi/70 ${numeral ? "flex items-baseline gap-3" : ""} ${className}`.trim()}
    >
      {numeral ? (
        <span lang="ja" aria-hidden="true" className="font-brush text-[1.6rem] font-normal normal-case leading-none text-sumi">
          {numeral}
        </span>
      ) : null}
      {numeral ? <span>{children}</span> : children}
    </p>
  );
}
