/**
 * A kanji numeral (一 二 三) set inside a small square outline, like the
 * outline seal. The frame makes 一 (a single stroke) read as a mark rather
 * than a dash. Decorative: the heading beside it carries the meaning.
 */
export function Numeral({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      lang="ja"
      aria-hidden="true"
      className={`inline-grid size-8 shrink-0 select-none place-items-center rounded-[2px] border border-sumi/60 font-brush text-[1.05rem] font-normal normal-case leading-none tracking-normal text-sumi ${className}`.trim()}
    >
      {children}
    </span>
  );
}
