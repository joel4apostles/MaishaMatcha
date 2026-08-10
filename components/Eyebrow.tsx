import type { ReactNode } from "react";

/**
 * Small-caps eyebrow: 0.75rem, 0.15em tracking. Quiet, never an accent color.
 */
export function Eyebrow({
  children,
  id,
  className = "",
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <p
      id={id}
      className={`text-eyebrow font-medium uppercase text-sumi/70 ${className}`.trim()}
    >
      {children}
    </p>
  );
}
