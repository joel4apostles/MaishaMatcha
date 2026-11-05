import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

/**
 * The counter's quiet frame: the mark in matcha, a hairline, then the work.
 * Content gets the whole tablet; the frame never competes with it.
 */
export function PosFrame({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex min-h-[64px] items-center justify-between gap-4 border-b border-wood/30 px-6 sm:px-8">
        <BrandMark className="h-8 w-auto text-matcha" />
        {aside}
      </header>
      {/* Tablets: the work sits centred in a calm column, not in a corner. */}
      <main className="flex flex-1 flex-col px-6 py-10 sm:px-8 sm:py-14 md:items-center md:justify-center">
        <div className="w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}

export function PosEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-eyebrow uppercase tracking-[0.15em] text-sumi/70">{children}</p>
  );
}
