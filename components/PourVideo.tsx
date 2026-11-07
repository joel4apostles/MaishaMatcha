"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * A real moment at the bar: matcha poured over ice, milk and ube, framed
 * square on the pour itself (hands, bowl, cup; silent, 6.8 s). It plays
 * once when half of it is in view, then rests on its last frame. Nothing
 * loops. Because it runs past five seconds there is a pause control
 * (WCAG 2.2.2), which turns into "watch again" at the end.
 * Reduced motion: the still of the finished drink, no playback.
 */
const FEATHER: React.CSSProperties = {
  WebkitMaskImage:
    "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent), linear-gradient(to bottom, transparent, #000 16%, #000 94%, transparent)",
  WebkitMaskComposite: "source-in",
  maskImage:
    "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent), linear-gradient(to bottom, transparent, #000 16%, #000 94%, transparent)",
  maskComposite: "intersect",
};

export function PourVideo({ className = "" }: { className?: string }) {
  const t = useTranslations("home.menuPreview");
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused" | "ended">("idle");
  const [still, setStill] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser on mount
      setStill(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          v.play().catch(() => setState("paused"));
        }
      },
      { threshold: 0.5 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (state === "playing") v.pause();
    else {
      if (state === "ended") v.currentTime = 0;
      void v.play();
    }
  };

  return (
    <figure className={className}>
      {/* The edges dissolve into the washi paper, like a print on the page
          (founder choice, 2026-11-07): a mask on the frame, not a colour gradient. */}
      <div className="relative" style={FEATHER}>
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element -- a plain still; next/image would add a second request path for one frame
          <img src="/images/pour-last.jpg" alt={t("videoAlt")} width={720} height={720} className="aspect-square h-auto w-full object-cover" />
        ) : (
          <video
            ref={ref}
            src="/video/pour.mp4"
            poster="/images/pour-first.jpg"
            muted
            playsInline
            preload="metadata"
            aria-label={t("videoAlt")}
            onPlay={() => setState("playing")}
            onPause={() => setState((s) => (s === "ended" ? s : "paused"))}
            onEnded={() => setState("ended")}
            width={720}
            height={720}
            className="aspect-square h-auto w-full object-cover"
          />
        )}
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-4">
        <span className="text-eyebrow uppercase text-sumi/70">{t("videoCaption")}</span>
        {still ? null : (
          <button
            type="button"
            onClick={toggle}
            className="inline-flex min-h-[44px] items-center text-sm text-sumi/80 underline decoration-wood/50 underline-offset-4 hover:text-sumi"
          >
            {state === "playing" ? t("videoPause") : state === "ended" ? t("videoAgain") : t("videoPlay")}
          </button>
        )}
      </figcaption>
    </figure>
  );
}
