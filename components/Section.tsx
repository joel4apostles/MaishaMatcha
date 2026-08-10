import type { ElementType, ReactNode } from "react";

/**
 * Section rhythm: generous vertical whitespace (≥ 4rem mobile, ≥ 6rem desktop)
 * and a capped content width. Whitespace is the primary material.
 */
export function Section({
  children,
  as: Tag = "section",
  id,
  className = "",
  innerClassName = "",
  labelledBy,
  ariaLabel,
}: {
  children: ReactNode;
  as?: ElementType;
  id?: string;
  className?: string;
  innerClassName?: string;
  labelledBy?: string;
  ariaLabel?: string;
}) {
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      className={`px-6 py-20 sm:px-8 sm:py-24 lg:py-28 ${className}`.trim()}
    >
      <div className={`mx-auto w-full max-w-[1100px] ${innerClassName}`.trim()}>
        {children}
      </div>
    </Tag>
  );
}
