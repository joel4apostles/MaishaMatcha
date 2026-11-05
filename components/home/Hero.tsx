import Image from "next/image";
import { useTranslations } from "next-intl";
import salonRender from "@/public/images/salon.jpg";
import matchaPowder from "@/public/images/matcha-powder.jpg";
import { WordReveal } from "@/components/WordReveal";
import { inkButtonClass } from "@/components/Button";
import { BrandWordmark } from "@/components/BrandWordmark";
import { riseDelay } from "./motion";

export function Hero() {
  const t = useTranslations("home.hero");
  const space = useTranslations("home.space");
  const cta = useTranslations("cta");
  return (
    <section className="dark-band relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden px-6 pt-16 sm:px-8">
      {/* The salon render at near-full warmth. */}
      <Image
        src={salonRender}
        alt={space("altMain")}
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-[60%_center]"
      />
      {/* Light unifying scrim; legibility comes from the ink panel below. */}
      <div aria-hidden="true" className="absolute inset-0 bg-sumi/25" />

      <div className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-end pb-16 pt-20 sm:pb-24">
        {/* Brand panel: flat kit matcha, sumi ink — AA-verified on any crop. */}
        <div
          className="brand-band anim-rise relative max-w-2xl overflow-hidden rounded-[2px] p-6 sm:p-10"
          style={riseDelay(100)}
        >
          {/* Real matcha powder under a green veil (contrast-safe at 20%). */}
          <Image
            src={matchaPowder}
            alt=""
            aria-hidden="true"
            fill
            sizes="672px"
            placeholder="blur"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-matcha/80" />
          <div className="relative">
          <p className="text-eyebrow uppercase text-sumi/85">{t("eyebrow")}</p>
          <h1 className="mt-6 text-sumi">
            <span className="sr-only">maisha matcha</span>
            <BrandWordmark className="h-auto w-full max-w-sm" />
          </h1>
          <p className="mt-7 max-w-xl font-serif text-poem font-light text-sumi/85">
            <WordReveal text={t("line")} baseDelay={400} step={70} />
          </p>
          <div className="mt-9">
            <a href="#socios" className={inkButtonClass}>
              {cta("joinWaitlist")}
            </a>
          </div>
          </div>
        </div>
      </div>

      {/* Quiet non-text scroll cue. */}
      <span
        aria-hidden="true"
        className="anim-rise absolute bottom-6 left-1/2 h-10 w-px -translate-x-1/2 bg-washi/60"
        style={riseDelay(1200)}
      />

      {/* Honesty note: project render, not a final photograph. */}
      <span className="absolute bottom-4 right-4 rounded-[2px] bg-matcha/90 px-2.5 py-1 text-eyebrow uppercase text-sumi/85">
        {space("renderNote")}
      </span>
    </section>
  );
}
