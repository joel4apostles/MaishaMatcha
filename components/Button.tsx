import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/routing";

/**
 * The single primary CTA style — filled olive-gold. Used sparingly: brand
 * law allows one primary CTA per view. Min 44px touch target.
 */
export const buttonClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-[2px] bg-gold px-7 py-3 text-sm font-medium tracking-wide text-washi transition-opacity duration-200 hover:opacity-90 disabled:opacity-50";

/** Quiet inline link — underline in wood, gold only on hover. */
export const quietLinkClass =
  "inline-flex min-h-[44px] items-center text-sm text-sumi underline decoration-wood/50 decoration-1 underline-offset-4 transition-colors hover:decoration-sumi/70";

export function Button({
  href,
  children,
  className = "",
}: {
  href: AppPathname;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClass} ${className}`.trim()}>
      {children}
    </Link>
  );
}

export function QuietLink({
  href,
  children,
  className = "",
}: {
  href: AppPathname;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${quietLinkClass} ${className}`.trim()}>
      {children}
    </Link>
  );
}
