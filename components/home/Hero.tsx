import Image from "next/image";
import { useTranslations } from "next-intl";
import stillLife from "@/public/images/hero-still-life.jpg";
import { WordReveal } from "@/components/WordReveal";
import { inkButtonClass, quietLinkClass } from "@/components/Button";
import { Link } from "@/i18n/navigation";
import { riseDelay } from "./motion";

/**
 * The opening spread, editorial and light: the line of poetry as the
 * headline (written in word by word), one quiet action, and a real
 * photograph from the salon framed as a tall portrait (shown near its
 * native size, so it stays sharp). The photograph unveils once, upward,
 * settling from a slight zoom; nothing loops; reduced motion shows it still.
 */
export function Hero() {
  const t = useTranslations("home.hero");
  const cta = useTranslations("cta");
  return (
    <section className="px-6 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1100px] grid-cols-1 items-center gap-12 py-14 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-16 md:py-20">
        <div>
          <p className="anim-rise text-eyebrow uppercase text-sumi/70" style={riseDelay(0)}>
            {t("eyebrow")}
          </p>
          <h1 className="mt-8 font-serif text-hero font-light text-sumi">
            <WordReveal text={t("line")} baseDelay={150} step={80} />
          </h1>
          <div className="anim-rise mt-12 flex flex-wrap items-center gap-x-8 gap-y-4" style={riseDelay(900)}>
            <a href="#socios" className={inkButtonClass}>
              {cta("joinWaitlist")}
            </a>
            <Link href="/menu" className={quietLinkClass}>
              {cta("toMenu")}
            </Link>
          </div>
        </div>

        <figure className="justify-self-center md:justify-self-end">
          <div className="hero-unveil relative w-full max-w-[26rem] overflow-hidden rounded-[2px]">
            <Image
              src={stillLife}
              alt={t("photoAlt")}
              priority
              placeholder="blur"
              sizes="(min-width: 768px) 416px, 90vw"
              className="hero-settle h-auto w-full"
            />
          </div>
          <figcaption className="anim-rise mt-4 text-eyebrow uppercase text-sumi/70" style={riseDelay(1300)}>
            {t("photoCaption")}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
