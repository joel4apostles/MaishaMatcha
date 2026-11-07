import Image from "next/image";
import { useTranslations } from "next-intl";
import salonPhoto from "@/public/images/salon-hero.jpg";
import matchaPowder from "@/public/images/matcha-powder.jpg";
import { WordReveal } from "@/components/WordReveal";
import { inkButtonClass } from "@/components/Button";
import { Link } from "@/i18n/navigation";
import { riseDelay } from "./motion";

/**
 * The opening: the salon, full bleed, under the transparent header, and a
 * matcha card in the lower left, mounted like a shikishi board (a fine
 * inner hairline). Beside the words, 一期一会 (ichigo ichie, "one time,
 * one meeting", the tea ceremony's own phrase) is brushed in vertically,
 * top to bottom, and a small sumi seal is pressed once at the end.
 * Each effect plays once; reduced motion shows everything still.
 */
export function Hero() {
  const t = useTranslations("home.hero");
  const cta = useTranslations("cta");
  return (
    <section className="dark-band relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden bg-sumi px-5 pt-16 sm:px-8">
      <Image
        src={salonPhoto}
        alt={t("salonAlt")}
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="hero-settle object-cover object-[50%_40%] md:object-[50%_41%]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-sumi/25" />

      <div className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-end pb-20 pt-24 sm:pb-20">
        <div className="brand-band anim-rise relative max-w-[40rem] overflow-hidden rounded-[2px]" style={riseDelay(100)}>
          {/* Real matcha powder under a flat green veil (AA-safe for sumi). */}
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
          <div aria-hidden="true" className="absolute inset-0 bg-matcha/95" />
          {/* Shikishi mount: a fine inner hairline. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[1px] border border-sumi/25 sm:inset-3" />

          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-5 p-7 sm:gap-10 sm:p-11">
            <div>
              <p className="text-eyebrow uppercase text-sumi/85">{t("eyebrow")}</p>
              <h1 className="mt-6 text-balance font-serif text-[clamp(1.9rem,2.6vw+1rem,3.25rem)] font-light leading-[1.12] tracking-[-0.01em] text-sumi">
                <WordReveal text={t("line")} baseDelay={450} step={75} />
              </h1>
              <p className="sr-only">{t("ichigo")}</p>
              <div className="anim-rise mt-9 flex flex-wrap items-center gap-x-7 gap-y-3" style={riseDelay(1300)}>
                <a href="#socios" className={inkButtonClass}>
                  {cta("joinWaitlist")}
                </a>
                <Link
                  href="/menu"
                  className="inline-flex min-h-[44px] items-center text-sm text-sumi underline decoration-sumi/40 decoration-1 underline-offset-4 transition-colors hover:decoration-sumi"
                >
                  {cta("toMenu")}
                </Link>
              </div>
            </div>

            {/* 一期一会, brushed vertically, signed with an outline seal beneath. */}
            <div className="flex flex-col items-center gap-4">
              <span
                lang="ja"
                aria-hidden="true"
                className="ink-write select-none font-brush text-[clamp(1.9rem,1.8vw+1.1rem,2.9rem)] leading-[1.1] text-sumi [writing-mode:vertical-rl]"
                style={{ animationDelay: "700ms" }}
              >
                一期一会
              </span>
              <span
                lang="ja"
                aria-hidden="true"
                className="hanko-press grid size-8 select-none place-items-center rounded-[2px] border border-sumi/70 font-brush text-[0.8rem] leading-[1.05] text-sumi [writing-mode:vertical-rl] sm:size-9 sm:text-[0.9rem]"
              >
                抹茶
              </span>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
