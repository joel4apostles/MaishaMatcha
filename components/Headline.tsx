import type { ReactNode } from "react";

/**
 * Serif display headline. Light weight, balanced wrapping to avoid orphans.
 */
export function Headline({
  children,
  as: Tag = "h2",
  id,
  className = "",
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <Tag
      id={id}
      className={`text-balance font-serif text-title font-light text-sumi ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
