"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile on the forms that send an email (security audit
 * 2026-11-09). "interaction-only": real visitors normally see nothing; only
 * when Cloudflare doubts the visitor does a small check appear. Off until
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set (the server checks the token with
 * TURNSTILE_SECRET_KEY). A token is single use: reset after each submit.
 */
type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
let loader: Promise<void> | null = null;

function loadScript() {
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

export function useHumanCheck(locale: "es" | "en") {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let gone = false;
    loadScript()
      .then(() => {
        if (gone || !ref.current || !window.turnstile) return;
        id.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          theme: "light",
          size: "flexible",
          appearance: "interaction-only",
          language: locale,
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => undefined);
    return () => {
      gone = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [locale]);

  const reset = useCallback(() => {
    setToken("");
    if (id.current && window.turnstile) window.turnstile.reset(id.current);
  }, []);

  return {
    token: token || undefined,
    reset,
    box: SITE_KEY ? <div ref={ref} className="empty:hidden" /> : null,
  };
}
