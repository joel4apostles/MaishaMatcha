import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

/**
 * The counter's quiet frame: the mark in matcha, a hairline, then the work.
 * Content gets the whole tablet; the frame never competes with it.
 */
export function PosFrame({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex min-h-[64px] items-center justify-between gap-4 border-b border-wood/30 px-4 sm:px-8">
        <BrandMark className="h-8 w-auto text-matcha" />
        {aside}
      </header>
      <main className="flex flex-1 flex-col px-4 py-10 sm:px-8 sm:py-14">{children}</main>
    </div>
  );
}

export function PosEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-eyebrow uppercase tracking-[0.15em] text-sumi/70">{children}</p>
  );
}
