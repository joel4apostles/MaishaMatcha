import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { site, siteHours, siteMapsUrl } from "@/content/site";
import salonEstantes from "@/public/images/salon-estantes.jpg";
import salonBarra from "@/public/images/salon-barra.jpg";
import salonArbol from "@/public/images/salon-arbol.jpg";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";

export function TheSpace() {
  const t = useTranslations("home.space");
  const footer = useTranslations("footer");
  const locale = useLocale();
  const details = [
    { src: salonEstantes, alt: t("alt1"), caption: t("caption1") },
    { src: salonBarra, alt: t("alt2"), caption: t("caption2") },
    { src: salonArbol, alt: t("alt3"), caption: t("caption3") },
  ];
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/25">
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
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
                    className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <figcaption className="mt-3 text-eyebrow uppercase text-sumi/70">
                  {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
          {/* Honesty: the interior is still a project render. */}
          <p className="mx-auto mt-3 max-w-[1600px] text-sm text-sumi/70">{t("renderNote")}</p>
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
        <div className="flex flex-col gap-1.5 text-sumi/80 md:pb-2">
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
