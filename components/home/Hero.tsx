import Image from "next/image";
import { useTranslations } from "next-intl";
import salonRender from "@/public/images/salon.jpg";
import { WordReveal } from "@/components/WordReveal";
import { Link } from "@/i18n/navigation";
import { riseDelay } from "./motion";

/**
 * The opening: the salon, full bleed, under the transparent header. No
 * panel or box: the line of poetry sits straight on the picture, lower
 * left, over a flat sumi veil (washi text measured AA on the brightest
 * crop). The picture settles once from a slight zoom; nothing loops.
 */
export function Hero() {
  const t = useTranslations("home.hero");
  const space = useTranslations("home.space");
  const cta = useTranslations("cta");
  return (
    <section className="dark-band relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden bg-sumi px-6 pt-16 sm:px-8">
      <Image
        src={salonRender}
        alt={t("salonAlt")}
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="hero-settle object-cover object-[60%_center]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-sumi/45" />

      <div className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-end pb-20 pt-24 sm:pb-24">
        <p className="anim-rise text-eyebrow uppercase text-washi/85" style={riseDelay(0)}>
          {t("eyebrow")}
        </p>
        <h1 className="mt-6 max-w-[15ch] text-balance font-serif text-hero font-light text-washi">
          <WordReveal text={t("line")} baseDelay={250} step={80} />
        </h1>
        <div className="anim-rise mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={riseDelay(1000)}>
          <a
            href="#socios"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[2px] bg-washi px-7 text-sm font-medium tracking-wide text-sumi transition-colors duration-300 hover:bg-washi/85"
          >
            {cta("joinWaitlist")}
          </a>
          <Link href="/menu" className="inline-flex min-h-[44px] items-center text-sm text-washi underline decoration-washi/50 decoration-1 underline-offset-4 transition-colors hover:decoration-washi">
            {cta("toMenu")}
          </Link>
        </div>
      </div>

      {/* Honesty note: project render, not a final photograph. */}
      <span className="absolute bottom-5 left-6 right-6 text-right text-[0.6875rem] uppercase tracking-[0.12em] text-washi/80 sm:left-auto sm:right-8">
        {space("renderNote")}
      </span>
    </section>
  );
}
