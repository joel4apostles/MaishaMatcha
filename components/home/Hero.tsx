import Image from "next/image";
import { useTranslations } from "next-intl";
import stillLife from "@/public/images/hero-still-life.jpg";
import matchaPowder from "@/public/images/matcha-powder.jpg";
import { WordReveal } from "@/components/WordReveal";
import { inkButtonClass } from "@/components/Button";
import { BrandWordmark } from "@/components/BrandWordmark";
import { riseDelay } from "./motion";

export function Hero() {
  const t = useTranslations("home.hero");
  const cta = useTranslations("cta");
  return (
    <section className="dark-band relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden bg-sumi px-6 pt-16 sm:px-8">
      {/* A real photograph from the salon: chasen, chawan and a maisha tin on
          the bar's green tiles. Phones: full bleed. Desktop: the right part of
          a flat ink field (the source is a portrait, never stretched wide).
          Phones and tablets: the photo fills the top of the hero so the
          objects sit just above the panel, never under it. */}
      <div className="absolute inset-x-0 top-0 bottom-[36%] md:top-16 md:left-1/2 md:w-[600px] md:-translate-x-1/2 lg:bottom-0 lg:left-auto lg:right-0 lg:w-[42%] lg:translate-x-0">
        <Image
          src={stillLife}
          alt={t("photoAlt")}
          fill
          priority
          placeholder="blur"
          sizes="(min-width: 1024px) 42vw, (min-width: 768px) 600px, 100vw"
          className="object-cover object-[50%_68%] lg:object-[15%_45%]"
        />
      </div>
      {/* Phones and tablets: a light scrim; legibility comes from the ink panel. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 bottom-[36%] bg-sumi/15 md:top-16 md:left-1/2 md:w-[600px] md:-translate-x-1/2 lg:hidden" />

      <div className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-end pb-16 pt-20 sm:pb-24 lg:justify-center lg:pb-16">
        {/* Brand panel: flat kit matcha, sumi ink — AA-verified on any crop. */}
        <div
          className="brand-band anim-rise relative max-w-2xl overflow-hidden rounded-[2px] p-6 sm:p-10 lg:max-w-[min(40rem,calc(58vw-max(2rem,(100vw-1100px)/2)-6rem))]"
          style={riseDelay(100)}
        >
          {/* Real matcha powder under a green veil (15% show-through, AA-safe).
              Zoomed to the photo's plain top-left corner: the pressed logo
              in its centre would double the lockup above it. */}
          <Image
            src={matchaPowder}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 768px) 1600px, 900px"
            quality={50}
            placeholder="blur"
            className="origin-top-left scale-[3] object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-matcha/85" />
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
        className="anim-rise absolute bottom-6 left-1/2 hidden h-10 w-px -translate-x-1/2 bg-washi/60 sm:block"
        style={riseDelay(1200)}
      />

    </section>
  );
}
