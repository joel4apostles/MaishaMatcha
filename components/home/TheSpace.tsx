import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { site, siteHours, siteMapsUrl } from "@/content/site";
import salonSala from "@/public/images/salon-sala.jpg";
import salonChasen from "@/public/images/salon-chasen.jpg";
import salonBanco from "@/public/images/salon-banco.jpg";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";

export function TheSpace() {
  const t = useTranslations("home.space");
  const footer = useTranslations("footer");
  const locale = useLocale();
  const details = [
    { src: salonSala, alt: t("alt1"), caption: t("caption1") },
    { src: salonChasen, alt: t("alt2"), caption: t("caption2") },
    { src: salonBanco, alt: t("alt3"), caption: t("caption3") },
  ];
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/25">
      <Reveal>
        <Eyebrow numeral="四">{t("eyebrow")}</Eyebrow>
        <Headline className="mt-5">{t("title")}</Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("body")}</p>
      </Reveal>

      {/* Full-bleed triptych: swipeable snap gallery on mobile, grid on desktop. */}
      <Reveal className="mt-14">
        <div className="bleed px-4 sm:px-6">
          <div tabIndex={0} role="region" aria-label={t("eyebrow")} className="mx-auto flex max-w-[1600px] snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:snap-none sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:pb-0">
            {details.map((image) => (
              <figure
                key={image.caption}
                className="group w-[82%] shrink-0 snap-start sm:w-auto sm:shrink"
              >
                <div className="overflow-hidden rounded-[2px]">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    sizes="(min-width: 640px) 33vw, 82vw"
                    placeholder="blur"
                    className="aspect-[3/4] h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <figcaption className="mt-3 text-eyebrow uppercase text-sumi/70">
                  {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Where and when, set like a colophon: the address large in the serif. */}
      <Reveal className="mt-16 grid grid-cols-1 gap-8 border-t border-wood/25 pt-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end md:gap-12">
        <div>
          <Eyebrow>{t("visitEyebrow")}</Eyebrow>
          <p className="mt-5 font-serif text-[clamp(2rem,3.4vw+0.5rem,3.25rem)] font-light leading-[1.08] text-sumi">
            {site.address}
            <span className="block text-sumi/60">{site.city}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1.5 text-sumi/80 md:pb-[0.35rem]">
          <span>{siteHours(locale)}</span>
          <a
            href={siteMapsUrl}
            rel="noreferrer"
            target="_blank"
            className="inline-flex min-h-[44px] w-fit items-center text-sumi underline decoration-wood/50 underline-offset-4 hover:decoration-sumi/70"
          >
            {footer("directions")}
          </a>
        </div>
      </Reveal>
    </Section>
  );
}
