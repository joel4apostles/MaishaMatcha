"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";

export type StoryVisualItem = {
  id: string;
  /** Calligraphic emblem; null renders the brand icon (the arrival). */
  glyph: string | null;
  era: string;
};

/**
 * The sticky visual that accompanies the story: as each chapter scrolls into
 * the reading band, the panel turns to that era's emblem: calligraphic
 * characters for the historical chapters, written in top to bottom like a
 * brush stroke, resolving into the brand icon when the story arrives in
 * Murcia. Scroll-spy via IntersectionObserver on [data-story-id] elements;
 * one reveal per change, nothing loops; reduced motion gets a plain fade.
 * Decorative (aria-hidden) — the chapters themselves carry the content.
 */
export function StoryVisual({ items }: { items: StoryVisualItem[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const els = items
      .map((item) =>
        document.querySelector<HTMLElement>(`[data-story-id="${item.id}"]`),
      )
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-story-id");
            const idx = items.findIndex((i) => i.id === id);
            if (idx >= 0) setActive(idx);
          }
        }
      },
      // The middle band of the viewport decides the active chapter.
      { rootMargin: "-35% 0px -45% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <div aria-hidden="true" className="relative h-[clamp(340px,38vw,540px)]">
      {items.map((item, i) => (
        <div
          key={item.id}
          // The old character leaves fast; the new one is written on a clean field.
          className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity ease-out ${i === active ? "duration-0 motion-reduce:duration-500" : "duration-200"}`}
          style={{ opacity: i === active ? 1 : 0 }}
        >
          {item.glyph ? (
            <span className={`select-none font-brush text-[clamp(9rem,20vw,19rem)] leading-none text-matcha/40 ${i === active ? "ink-write" : ""}`}>
              {item.glyph}
            </span>
          ) : (
            <BrandMark className={`h-[clamp(8rem,13vw,12rem)] w-auto text-matcha/50 opacity-70 ${i === active ? "ink-write" : ""}`} />
          )}
          <span className={`mt-8 text-eyebrow uppercase text-sumi/70 ${i === active ? "ink-write-late" : ""}`}>
            {item.era}
          </span>
        </div>
      ))}
    </div>
  );
}
