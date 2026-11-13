"use client";

import { useEffect } from "react";

/**
 * Folds the given sidebar groups ONCE per browser, through Payload's own
 * toggle, so the choice is saved in the user's preferences like any other
 * fold; afterwards the user's own open or closed state is left alone.
 */
export function NavFold({ labels }: { labels: string[] }) {
  useEffect(() => {
    try {
      if (localStorage.getItem("maisha-nav-folded-v1")) return;
      const toggles = [...document.querySelectorAll<HTMLButtonElement>("button.nav-group__toggle")];
      for (const b of toggles) {
        const label = b.querySelector(".nav-group__label")?.textContent?.trim() ?? "";
        if (labels.includes(label) && b.classList.contains("nav-group__toggle--open")) b.click();
      }
      localStorage.setItem("maisha-nav-folded-v1", "1");
    } catch {
      // Private mode or no storage: the group simply stays open.
    }
  }, [labels]);
  return null;
}
