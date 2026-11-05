"use client";

import { useEffect } from "react";

const FIELD = "input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select, [contenteditable=true]";
const MARGIN = 24;

/**
 * Keeps the focused form field visible above the on-screen keyboard.
 *
 * Android (with the viewport's interactive-widget=resizes-content) shrinks
 * the page itself; iOS only shrinks the visual viewport, so a field low on
 * the screen can end up under the keyboard. Whenever a field gains focus or
 * the visual viewport changes size, scroll the field to the middle of what
 * is still visible. Renders nothing.
 */
export function KeyboardSafeFields() {
  useEffect(() => {
    const vv = window.visualViewport;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const reveal = (el: Element | null) => {
      if (!(el instanceof HTMLElement) || !el.matches(FIELD)) return;
      const rect = el.getBoundingClientRect();
      const top = vv ? vv.offsetTop : 0;
      const height = vv ? vv.height : window.innerHeight;
      if (rect.top < top + MARGIN || rect.bottom > top + height - MARGIN) {
        // Centre the field in what is actually visible. On iOS the layout
        // viewport does not shrink for the keyboard, so scrollIntoView would
        // centre it behind the keyboard; scrolling by the visual-viewport
        // offset works on both iOS and Android.
        const delta = rect.top - top - (height - rect.height) / 2;
        window.scrollBy({ top: delta, behavior: reduce.matches ? "auto" : "smooth" });
      }
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFocusIn = (e: FocusEvent) => {
      reveal(e.target as Element);
      // Again once the keyboard has finished sliding in.
      clearTimeout(timer);
      timer = setTimeout(() => reveal(document.activeElement), 350);
    };
    const onResize = () => reveal(document.activeElement);

    document.addEventListener("focusin", onFocusIn);
    vv?.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
      vv?.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
