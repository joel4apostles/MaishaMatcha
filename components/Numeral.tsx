/**
 * A kanji numeral (一 二 三) in the brush face, set large enough that 一
 * shows its brush taper and reads as a written mark, not a dash. No frame:
 * the outline square belongs to the seal alone (each motif once per page).
 * Decorative: the heading beside it carries the meaning.
 */
export function Numeral({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      lang="ja"
      aria-hidden="true"
      className={`inline-block min-w-[1.75rem] shrink-0 select-none text-center font-brush text-[1.5rem] font-normal normal-case leading-none tracking-normal text-sumi ${className}`.trim()}
    >
      {children}
    </span>
  );
}
