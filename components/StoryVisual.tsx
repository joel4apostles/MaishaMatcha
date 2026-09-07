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
 * the reading band, the panel crossfades to that era's emblem — calligraphic
 * characters for the historical chapters, resolving into the brand icon when
 * the story arrives in Murcia. Scroll-spy via IntersectionObserver on
 * [data-story-id] elements; one 500ms crossfade per change, nothing loops.
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
    <div aria-hidden="true" className="relative h-[340px]">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ease-out"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          {item.glyph ? (
            <span className="select-none font-serif text-[9rem] leading-none text-matcha/30">
              {item.glyph}
            </span>
          ) : (
            <BrandMark className="h-40 w-auto text-matcha/40" />
          )}
          <span className="mt-6 text-eyebrow uppercase text-sumi/70">
            {item.era}
          </span>
        </div>
      ))}
    </div>
  );
}
