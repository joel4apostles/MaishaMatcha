import { Fragment, type ReactNode } from "react";

/**
 * Fraunces' own ū glyph (as served by Google Fonts) draws its macron offset
 * to the right, at every optical size: "Rikyū" reads "Rikyu¯". In serif
 * display text we draw the macron ourselves over a plain u (`.macron-u` in
 * globals.css, sized in em so it scales with the headline). Screen readers
 * and copy-paste still get the real ū.
 */
export function withMacrons(text: string): ReactNode {
  if (!/[ūŪ]/.test(text)) return text;
  // nowrap: the drawn letter is an inline block, which would otherwise let
  // the line break inside the word ("Riky" / "ū").
  return <span className="whitespace-nowrap">{text.split(/([ūŪ])/).map((part, i) =>
    part === "ū" || part === "Ū" ? (
      <span key={i} className="macron-u">
        <span aria-hidden="true">{part === "ū" ? "u" : "U"}</span>
        <span className="sr-only">{part}</span>
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )}</span>;
}
